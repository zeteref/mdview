(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const defaults = { font: 16, width: 576 };
    const saved = (typeof window.__MDV_SETTINGS__ === "object" && window.__MDV_SETTINGS__) || {};
    const font = {
      v: Number.isFinite(Number(saved.font)) ? Number(saved.font) : defaults.font,
      min: 10,
      max: 40,
      step: 1
    };
    const width = {
      v: Number.isFinite(Number(saved.width)) ? Number(saved.width) : defaults.width,
      min: 320,
      max: 2560,
      step: 64
    };

    // Wrap each h2 and its following siblings into a card.
    document.querySelectorAll("h2").forEach((heading) => {
      if (heading.closest("section.mdv-block")) return;
      const section = document.createElement("section");
      section.className = "mdv-block";
      const body = document.createElement("div");
      body.className = "mdv-body";
      heading.parentNode.insertBefore(section, heading);
      section.appendChild(heading);
      let node = section.nextSibling;
      while (node && !(node.nodeType === 1 && node.tagName === "H2")) {
        const next = node.nextSibling;
        body.appendChild(node);
        node = next;
      }
      section.appendChild(body);
    });

    const closeWindow = () => {
      if (window.mdv && window.mdv.close) window.mdv.close();
      else window.close();
    };

    const close = document.createElement("button");
    close.type = "button";
    close.className = "mdv-close";
    close.setAttribute("aria-label", "Close");
    close.textContent = "×";
    close.addEventListener("click", closeWindow);
    document.body.appendChild(close);

    document.addEventListener("keydown", (event) => {
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      if (event.key === "q") {
        closeWindow();
      } else if (event.key === "j" || event.key === "k") {
        const step = Math.round(window.innerHeight * 0.2);
        window.scrollBy({ top: event.key === "j" ? step : -step, behavior: "smooth" });
      }
    });

    const pos = document.createElement("div");
    pos.className = "mdv-pos";
    const updatePos = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max <= 0 ? 0 : Math.round((window.scrollY / max) * 100);
      pos.textContent = pct + "%";
    };
    updatePos();
    document.addEventListener("scroll", updatePos, { passive: true });
    window.addEventListener("resize", updatePos);
    document.body.appendChild(pos);

    function lineText(span) {
      const clone = span.cloneNode(true);
      clone.querySelectorAll("a").forEach((a) => a.remove());
      return clone.textContent.replace(/\u00a0/g, " ").replace(/\s+$/, "");
    }
    function blockText(block) {
      const code = block.querySelector("code") || block;
      const lines = [...code.children].filter((node) => node.tagName === "SPAN");
      if (lines.length) return lines.map(lineText).join("\n");
      return (code.innerText || code.textContent || "").replace(/\n$/, "");
    }
    function copyText(text, button) {
      const done = () => {
        button.textContent = "Copied";
        setTimeout(() => { button.textContent = "Copy"; }, 1200);
      };
      const fallback = () => {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.left = "-9999px";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        area.remove();
        done();
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done).catch(fallback);
      } else {
        fallback();
      }
    }

    document.querySelectorAll("div.sourceCode").forEach((block) => {
      const pre = block.querySelector("pre");
      const lang = pre
        ? [...pre.classList].find((name) => name !== "sourceCode" && name !== "numberSource")
        : "";
      if (lang) {
        const label = document.createElement("span");
        label.className = "mdv-lang";
        label.textContent = lang;
        block.appendChild(label);
      }
      const button = document.createElement("button");
      button.type = "button";
      button.className = "mdv-copy";
      button.textContent = "Copy";
      button.addEventListener("click", () => copyText(blockText(block), button));
      block.appendChild(button);
    });

    document.querySelectorAll("pre").forEach((pre) => {
      if (pre.closest("div.sourceCode")) return;
      pre.classList.add("mdv-plain");
      const code = pre.querySelector("code");
      if (code) {
        const m = /(?:^|\s)language-([\w+-]+)/.exec(code.className || "");
        if (m) {
          const label = document.createElement("span");
          label.className = "mdv-lang";
          label.textContent = m[1];
          pre.appendChild(label);
        }
      }
      const button = document.createElement("button");
      button.type = "button";
      button.className = "mdv-copy";
      button.textContent = "Copy";
      button.addEventListener("click", () => copyText(blockText(pre), button));
      pre.appendChild(button);
    });

    // Text / width controls.
    const fontVal = document.createElement("span");
    const widthVal = document.createElement("span");
    const saveSettings = () => {
      if (window.mdv && window.mdv.save) {
        window.mdv.save({ font: font.v, width: width.v });
      }
    };
    const repaint = () => {
      document.documentElement.style.fontSize = font.v + "px";
      document.body.style.maxWidth = width.v + "px";
      fontVal.textContent = font.v;
      widthVal.textContent = width.v;
      saveSettings();
    };
    const ui = document.createElement("div");
    ui.className = "mdv-ui";
    const addGroup = (label, state, val) => {
      const g = document.createElement("div");
      g.className = "mdv-ui-group";
      const lab = document.createElement("span");
      lab.className = "mdv-ui-label";
      lab.textContent = label;
      val.className = "mdv-ui-value";
      const minus = document.createElement("button");
      minus.type = "button";
      minus.textContent = "−";
      minus.setAttribute("aria-label", label + " decrease");
      const plus = document.createElement("button");
      plus.type = "button";
      plus.textContent = "+";
      plus.setAttribute("aria-label", label + " increase");
      minus.addEventListener("click", () => { state.v = Math.max(state.min, state.v - state.step); repaint(); });
      plus.addEventListener("click", () => { state.v = Math.min(state.max, state.v + state.step); repaint(); });
      g.appendChild(lab);
      g.appendChild(minus);
      g.appendChild(val);
      g.appendChild(plus);
      return g;
    };
    ui.appendChild(addGroup("text", font, fontVal));
    ui.appendChild(addGroup("width", width, widthVal));
    const reset = document.createElement("button");
    reset.type = "button";
    reset.textContent = "reset";
    reset.style.width = "auto";
    reset.style.padding = "0 0.6em";
    reset.addEventListener("click", () => { font.v = defaults.font; width.v = defaults.width; repaint(); });
    ui.appendChild(reset);
    document.body.appendChild(ui);

    // Table of contents (top-left, toggle with "t").
    function slugify(text) {
      return text.toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/[\s_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "section";
    }
    const toc = document.createElement("nav");
    toc.className = "mdv-toc";
    document.querySelectorAll("h1, h2, h3").forEach((h, i) => {
      if (h.classList.contains("title")) return;
      if (!h.id) h.id = slugify(h.textContent) + "-" + (i + 1);
      const a = document.createElement("a");
      a.textContent = h.textContent;
      a.href = "#" + h.id;
      if (h.tagName === "H3") a.classList.add("mdv-toc-h3");
      a.addEventListener("click", (ev) => {
        ev.preventDefault();
        h.scrollIntoView({ block: "start", behavior: "smooth" });
      });
      toc.appendChild(a);
    });
    document.body.appendChild(toc);

    document.addEventListener("keydown", (event) => {
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      if (event.key === "[") { width.v = Math.max(width.min, width.v - width.step); repaint(); }
      else if (event.key === "]") { width.v = Math.min(width.max, width.v + width.step); repaint(); }
      else if (event.key === "{") { font.v = Math.max(font.min, font.v - font.step); repaint(); }
      else if (event.key === "}") { font.v = Math.min(font.max, font.v + font.step); repaint(); }
      else if (event.key === "t") { toc.classList.toggle("mdv-toc-hidden"); }
    });

    repaint();
  });
})();
