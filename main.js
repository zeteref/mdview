"use strict";

const { app, BrowserWindow, ipcMain } = require("electron");
const { execFile } = require("child_process");

// Text-heavy viewer: software rendering is fine and avoids Vulkan-on-Wayland
// GPU warnings / potential black windows.
app.disableHardwareAcceleration();
const fs = require("fs");
const path = require("path");
const os = require("os");

const APP_DIR = __dirname;
const CONFIG_PATH = path.join(
  process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"),
  "mdview",
  "config.json"
);
const MarkdownIt = require(path.join(APP_DIR, "vendor", "markdown-it.min.js"));

const USAGE = [
  "usage: mdview [--pandoc|--marked] <file.md>",
  "  renders a markdown file and opens it in a window",
  "  --pandoc  render with pandoc (default)",
  "  --marked  render with the bundled markdown-it",
  "  q close · j/k scroll · [ ] width · { } font · t toc",
].join("\n");

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

// Electron may inject switches ahead of the app path, so locate the app path
// marker and take arguments after it. Handles both `--` and no-`--` forms.
function userArgs() {
  const argv = process.argv;
  const markers = [APP_DIR, path.join(APP_DIR, "main.js"), path.join(APP_DIR, "package.json")];
  let idx = -1;
  for (const m of markers) {
    const i = argv.indexOf(m);
    if (i >= 0) {
      idx = i;
      break;
    }
  }
  const args = idx >= 0 ? argv.slice(idx + 1) : argv.slice(2);
  return args.filter((a) => a !== "--");
}

function parseArgs() {
  const args = userArgs();
  let renderer = "pandoc";
  let file = null;
  let help = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--marked" || a === "--js" || a === "--markdown-it") {
      renderer = "marked";
    } else if (a === "--pandoc") {
      renderer = "pandoc";
    } else if (a === "--renderer") {
      renderer = args[++i] || "pandoc";
    } else if (a.startsWith("--renderer=")) {
      renderer = a.slice("--renderer=".length);
    } else if (a === "-h" || a === "--help") {
      help = true;
    } else if (!a.startsWith("-")) {
      file = a;
    }
  }
  if (renderer !== "pandoc" && renderer !== "marked") renderer = "pandoc";
  return { renderer, file, help };
}

function readConfig() {
  const def = { font: 16, width: 576 };
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    const font = Number.isFinite(Number(raw.font)) ? Number(raw.font) : def.font;
    const width = Number.isFinite(Number(raw.width)) ? Number(raw.width) : def.width;
    return { font: clamp(font, 10, 40), width: clamp(width, 320, 2560) };
  } catch {
    return def;
  }
}

function renderPandoc(file) {
  return new Promise((resolve, reject) => {
    execFile(
      "pandoc",
      ["-f", "markdown", "-t", "html5", "--standalone", "--metadata", `title=${path.basename(file)}`, file],
      { maxBuffer: 256 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) reject(new Error((stderr || String(err)).trim()));
        else resolve(stdout);
      }
    );
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;"
  );
}

function renderMarked(md, title) {
  const mdIt = new MarkdownIt();
  const body = mdIt.render(md);
  return [
    "<!DOCTYPE html>",
    "<html>",
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    `<title>${escapeHtml(title)}</title>`,
    "</head>",
    "<body>",
    body,
    "</body>",
    "</html>",
  ].join("\n");
}

function buildHtml(baseHtml, settings) {
  const css = fs.readFileSync(path.join(APP_DIR, "inject.css"), "utf8");
  const js = fs.readFileSync(path.join(APP_DIR, "inject.js"), "utf8");
  const bootstrap = `<script>window.__MDV_SETTINGS__ = ${JSON.stringify(settings)};</script>`;
  const inject = `<style>\n${css}\n</style>\n${bootstrap}\n<script>\n${js}\n</script>`;
  return baseHtml.replace("</head>", `${inject}\n</head>`);
}

function createWindow(html) {
  const win = new BrowserWindow({
    width: 960,
    height: 900,
    backgroundColor: "#efeae2",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(APP_DIR, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const tmp = path.join(os.tmpdir(), `mdview-${process.pid}-${Date.now()}.html`);
  fs.writeFileSync(tmp, html);
  win.loadFile(tmp);
  win.on("closed", () => {
    try {
      fs.unlinkSync(tmp);
    } catch {}
  });
}

ipcMain.on("save-settings", (_event, s) => {
  try {
    const f = Number(s && s.font);
    const w = Number(s && s.width);
    if (!Number.isFinite(f) || !Number.isFinite(w)) return;
    const font = clamp(f, 10, 40);
    const width = clamp(w, 320, 2560);
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ font, width }, null, 2));
  } catch {}
});

ipcMain.on("close-window", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

app.whenReady().then(async () => {
  const { renderer, file, help } = parseArgs();
  if (help || !file) {
    process.stderr.write(USAGE + "\n");
    app.exit(help ? 0 : 1);
    return;
  }

  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) {
    process.stderr.write(`not found: ${file}\n`);
    app.exit(1);
    return;
  }

  let baseHtml;
  try {
    if (renderer === "marked") {
      const md = fs.readFileSync(abs, "utf8");
      baseHtml = renderMarked(md, path.basename(abs));
    } else {
      baseHtml = await renderPandoc(abs);
    }
  } catch (e) {
    process.stderr.write(`render failed (${renderer}): ${e && e.message ? e.message : e}\n`);
    app.exit(1);
    return;
  }

  createWindow(buildHtml(baseHtml, readConfig()));
});

app.on("window-all-closed", () => {
  app.quit();
});
