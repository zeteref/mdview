"use strict";

// Markdown -> Pango markup, for rendering a file in osd-window as a single
// card. Palette is tuned for osd-window's dark default background.

const C = {
  heading: "#e8c76a",
  code: "#d8cfb8",
  codeBg: "#26221c",
  link: "#8ec9ff",
  quote: "#b8ae94",
};

const HEADING_SIZES = ["", "xx-large", "x-large", "large", "medium", "medium", "small"];

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function headingSize(level) {
  return HEADING_SIZES[Math.min(Math.max(level, 1), 6)];
}

// Inline formatting: code, bold, strikethrough, links, then italic.
function inline(text) {
  let s = esc(text);
  s = s.replace(/`([^`]+)`/g, `<span font_family='monospace' foreground='${C.code}'>$1</span>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  s = s.replace(/~~([^~]+)~~/g, "<s>$1</s>");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<span foreground='${C.link}' underline='single'>$1</span>`);
  s = s.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<i>$2</i>");
  return s;
}

function codeBlock(code) {
  return `<span font_family='monospace' background='${C.codeBg}' foreground='${C.code}'>${esc(code)}</span>`;
}

function markdownToPango(markdown) {
  const lines = String(markdown).split("\n");
  let out = "";
  let para = [];
  let inFence = false;
  let fence = [];

  const flushPara = () => {
    if (para.length) {
      out += inline(para.join(" ")) + "\n\n";
      para = [];
    }
  };

  for (const line of lines) {
    if (inFence) {
      if (/^```/.test(line)) {
        out += codeBlock(fence.join("\n")) + "\n\n";
        inFence = false;
        fence = [];
      } else {
        fence.push(line);
      }
      continue;
    }

    if (/^```/.test(line)) {
      flushPara();
      inFence = true;
      fence = [];
      continue;
    }

    if (/^\s*$/.test(line)) {
      flushPara();
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushPara();
      out += `<span size='${headingSize(heading[1].length)}' weight='bold' foreground='${C.heading}'>${inline(heading[2])}</span>\n\n`;
      continue;
    }

    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flushPara();
      out += "────────────────────────\n\n";
      continue;
    }

    const quote = /^\s*>\s?(.*)$/.exec(line);
    if (quote) {
      flushPara();
      out += `<span foreground='${C.quote}'><i>${inline(quote[1])}</i></span>\n`;
      continue;
    }

    const listItem = /^\s*(?:[-*+]\s+)(.*)$/.exec(line);
    if (listItem) {
      flushPara();
      out += `• ${inline(listItem[1])}\n`;
      continue;
    }

    const orderedItem = /^\s*(\d+)[.)]\s+(.*)$/.exec(line);
    if (orderedItem) {
      flushPara();
      out += `${orderedItem[1]}. ${inline(orderedItem[2])}\n`;
      continue;
    }

    if (/^(?: {4}|\t)/.test(line)) {
      flushPara();
      out += codeBlock(line.replace(/^(?: {4}|\t)/, "")) + "\n";
      continue;
    }

    para.push(line);
  }

  flushPara();
  if (inFence && fence.length) {
    out += codeBlock(fence.join("\n")) + "\n";
  }

  return out.trim();
}

module.exports = { markdownToPango };
