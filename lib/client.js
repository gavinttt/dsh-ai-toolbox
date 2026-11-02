window.__ModuleLoader__.load({
  id: "dsh-ai-toolbox",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.jsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"), 1);

// src/client/markdown.js
var ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ESCAPES[character]);
}
function safeHref(raw) {
  const value = String(raw ?? "").trim().replace(/^&lt;|&gt;$/g, "");
  if (/^(?:https?:\/\/|mailto:)/i.test(value)) return value;
  return "";
}
function inline(text) {
  let source = escapeHtml(text);
  const codes = [];
  source = source.replace(/`([^`]+)`/g, (_, code) => {
    codes.push(code);
    return `\0${codes.length - 1}\0`;
  });
  source = source.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt) => `<span class="ait-md-image">\u{1F5BC} ${alt || "\u56FE\u7247"}</span>`);
  source = source.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const target = safeHref(href);
    return target ? `<a href="${escapeHtml(target)}" target="_blank" rel="noreferrer noopener">${label}</a>` : label;
  });
  source = source.replace(/&lt;(https?:\/\/[^&\s]+?)&gt;/g, (_, href) => {
    const target = safeHref(href);
    return target ? `<a href="${escapeHtml(target)}" target="_blank" rel="noreferrer noopener">${escapeHtml(href)}</a>` : href;
  });
  source = source.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/__([^_]+)__/g, "<strong>$1</strong>").replace(/~~([^~]+)~~/g, "<del>$1</del>").replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>").replace(/(^|[^_])_([^_]+)_/g, "$1<em>$2</em>");
  source = source.replace(/\u0000(\d+)\u0000/g, (_, index) => `<code>${codes[Number(index)]}</code>`);
  return source;
}
function isBlockStart(line) {
  return /^\s*(?:#{1,6}\s|```|~~~|>|[-*+]\s|\d+\.\s|---+\s*$)/.test(line);
}
function renderTable(lines, start) {
  const headerLine = lines[start];
  const separator = lines[start + 1] ?? "";
  if (!headerLine.includes("|") || !/^\s*\|?[\s:|-]+\|?\s*$/.test(separator)) return null;
  const split = (row) => row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
  const headers = split(headerLine);
  const rows = [];
  let index = start + 2;
  while (index < lines.length && lines[index].includes("|") && lines[index].trim() !== "") {
    rows.push(split(lines[index]));
    index++;
  }
  const head = headers.map((cell) => `<th>${inline(cell)}</th>`).join("");
  const body = rows.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join("")}</tr>`).join("");
  return {
    html: `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`,
    next: index
  };
}
function renderMarkdown(markdown) {
  let source = String(markdown ?? "").replace(/\r\n?/g, "\n");
  source = source.replace(/^---\n[\s\S]*?\n---\n/, "");
  const lines = source.split("\n");
  const html = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (/^\s*$/.test(line)) {
      index++;
      continue;
    }
    const fence = /^\s*(```|~~~)\s*([\w-]*)\s*$/.exec(line);
    if (fence) {
      const marker = fence[1];
      const language = fence[2] || "";
      index++;
      const code = [];
      while (index < lines.length && !new RegExp(`^\\s*${marker}`).test(lines[index])) {
        code.push(lines[index]);
        index++;
      }
      if (index < lines.length) index++;
      const className = language ? ` class="language-${escapeHtml(language)}"` : "";
      html.push(`<pre><code${className}>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }
    const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      index++;
      continue;
    }
    if (/^\s*(?:---+|\*\*\*+|___+)\s*$/.test(line)) {
      html.push("<hr/>");
      index++;
      continue;
    }
    if (/^\s*>/.test(line)) {
      const quote = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/, ""));
        index++;
      }
      html.push(`<blockquote>${renderMarkdown(quote.join("\n"))}</blockquote>`);
      continue;
    }
    const listMatch = /^(\s*)([-*+]|\d+\.)\s+(.+)$/.exec(line);
    if (listMatch) {
      const ordered = /\d+\./.test(listMatch[2]);
      const items = [];
      while (index < lines.length) {
        const item = /^(\s*)([-*+]|\d+\.)\s+(.+)$/.exec(lines[index]);
        if (!item) break;
        let content = item[3];
        const task = /^\[([ xX])\]\s+(.*)$/.exec(content);
        if (task) content = `<span class="ait-md-check">${task[1].toLowerCase() === "x" ? "\u2611" : "\u2610"}</span> ${inline(task[2])}`;
        else content = inline(content);
        items.push(`<li>${content}</li>`);
        index++;
      }
      html.push(ordered ? `<ol>${items.join("")}</ol>` : `<ul>${items.join("")}</ul>`);
      continue;
    }
    if (line.includes("|")) {
      const table = renderTable(lines, index);
      if (table) {
        html.push(table.html);
        index = table.next;
        continue;
      }
    }
    const paragraph = [line];
    index++;
    while (index < lines.length && !/^\s*$/.test(lines[index]) && !isBlockStart(lines[index])) {
      if (lines[index].includes("|") && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[index + 1] ?? "")) break;
      paragraph.push(lines[index]);
      index++;
    }
    html.push(`<p>${paragraph.map(inline).join("<br/>")}</p>`);
  }
  return html.join("");
}

// src/client/styles.js
var STYLES = String.raw`

.ait-page {
  --ait-bg: var(--dsw-alias-bg-base, #ffffff);
  --ait-card: var(--dsw-alias-bg-layer-1, #ffffff);
  --ait-card-strong: var(--dsw-alias-bg-layer-2, #f7f7f8);
  --ait-fill: var(--dsw-alias-bg-layer-3, #f0f0f2);
  --ait-border: var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.10));
  --ait-border-strong: var(--dsw-alias-border-l3, rgba(0, 0, 0, 0.16));
  --ait-text: var(--dsw-alias-label-primary, #17181c);
  --ait-text-2: var(--dsw-alias-label-secondary, #5b5e66);
  --ait-text-3: var(--dsw-alias-label-tertiary, #8b8e96);
  --ait-accent: var(--dsw-alias-state-business-primary, #4176e6);
  --ait-accent-soft: color-mix(in srgb, var(--ait-accent) 12%, transparent);
  --ait-green: var(--dsw-alias-state-success-primary, #1c9b62);
  --ait-green-soft: color-mix(in srgb, var(--ait-green) 13%, transparent);
  --ait-amber: var(--dsw-alias-state-warn-primary, #c18416);
  --ait-amber-soft: color-mix(in srgb, var(--ait-amber) 14%, transparent);
  --ait-red: var(--dsw-alias-state-error-primary, #d14343);
  --ait-red-soft: color-mix(in srgb, var(--ait-red) 12%, transparent);
  --ait-radius: 15px;
  color: var(--ait-text);
  background: var(--ait-bg);
  box-sizing: border-box;
  height: 100%;
  overflow: auto;
  padding: 30px clamp(18px, 4vw, 52px) 72px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

.ait-page *,
.ait-page *::before,
.ait-page *::after { box-sizing: border-box; }

.ait-inner { width: 100%; max-width: 1160px; margin: 0 auto; }

.ait-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
.ait-eyebrow { color: var(--ait-accent); font-size: 11px; font-weight: 700; letter-spacing: 0.13em; margin-bottom: 6px; }
.ait-title { margin: 0; font-size: 28px; font-weight: 680; letter-spacing: -0.025em; line-height: 1.15; }
.ait-subtitle { margin: 9px 0 0; color: var(--ait-text-2); font-size: 13.5px; max-width: 620px; }
.ait-head-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }

.ait-btn {
  appearance: none;
  border: 0.5px solid var(--ait-border-strong);
  background: var(--ait-card);
  color: var(--ait-text);
  border-radius: 10px;
  min-height: 34px;
  padding: 7px 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font: inherit;
  font-size: 13px;
  font-weight: 550;
  line-height: 1;
  cursor: pointer;
  white-space: nowrap;
  transition: background 120ms ease, border-color 120ms ease, transform 120ms ease, opacity 120ms ease;
}
.ait-btn:hover:not(:disabled) { background: var(--ait-card-strong); border-color: var(--ait-border-strong); }
.ait-btn:active:not(:disabled) { transform: translateY(1px); }
.ait-btn:disabled { cursor: default; opacity: 0.48; }
.ait-btn-primary { background: var(--ait-accent); border-color: transparent; color: #fff; }
.ait-btn-primary:hover:not(:disabled) { background: color-mix(in srgb, var(--ait-accent) 88%, #000); border-color: transparent; }
.ait-btn-danger { color: var(--ait-red); }
.ait-btn-ghost { border-color: transparent; background: transparent; color: var(--ait-text-2); }
.ait-btn-ghost:hover:not(:disabled) { background: var(--ait-fill); color: var(--ait-text); }
.ait-btn-sm { min-height: 29px; padding: 5px 9px; font-size: 12px; border-radius: 8px; }
.ait-btn-icon { width: 34px; padding: 0; }
.ait-btn-icon.ait-btn-sm { width: 29px; }

.ait-stats { display: flex; gap: 10px; flex-wrap: wrap; margin: 24px 0 18px; }
.ait-stat {
  display: flex; align-items: baseline; gap: 6px;
  padding: 8px 12px; border-radius: 10px;
  background: var(--ait-card); border: 0.5px solid var(--ait-border);
  color: var(--ait-text-2); font-size: 12px;
}
.ait-stat b { color: var(--ait-text); font-size: 16px; font-weight: 650; font-variant-numeric: tabular-nums; }

.ait-toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: space-between; margin-bottom: 12px; }
.ait-search { position: relative; flex: 1 1 240px; max-width: 360px; }
.ait-search svg { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--ait-text-3); pointer-events: none; }
.ait-search input {
  width: 100%; height: 36px; padding: 0 12px 0 34px;
  border: 0.5px solid var(--ait-border-strong); border-radius: 10px;
  background: var(--ait-card); color: var(--ait-text);
  font: inherit; font-size: 13px; outline: none;
}
.ait-search input::placeholder { color: var(--ait-text-3); }
.ait-search input:focus { border-color: var(--ait-accent); box-shadow: 0 0 0 2px var(--ait-accent-soft); }
.ait-categories { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
.ait-cat-label { color: var(--ait-text-3); font-size: 11px; margin-right: 1px; }
.ait-cat {
  appearance: none; display: inline-flex; align-items: center; gap: 5px;
  border: 0.5px solid var(--ait-border); background: var(--ait-card); color: var(--ait-text-2);
  border-radius: 999px; min-height: 29px; padding: 4px 11px; font: inherit; font-size: 12px; cursor: pointer;
}
.ait-cat:hover { border-color: var(--ait-border-strong); color: var(--ait-text); }
.ait-cat[data-active="true"] { background: var(--ait-accent-soft); border-color: transparent; color: var(--ait-accent); font-weight: 600; }
.ait-cat-count { font-size: 10px; opacity: 0.62; }
.ait-filters { display: inline-flex; padding: 3px; border-radius: 10px; background: var(--ait-fill); gap: 2px; }
.ait-filter {
  appearance: none; border: 0; background: transparent; color: var(--ait-text-2);
  border-radius: 8px; min-height: 28px; padding: 4px 10px; font: inherit; font-size: 12px; cursor: pointer;
}
.ait-filter[data-active="true"] { background: var(--ait-card); color: var(--ait-text); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }

.ait-dirs { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 22px; }
.ait-dir {
  display: inline-flex; align-items: center; gap: 6px; max-width: 300px;
  min-height: 27px; padding: 4px 5px 4px 10px; border-radius: 999px;
  background: var(--ait-card); border: 0.5px solid var(--ait-border);
  color: var(--ait-text-2); font-size: 11.5px;
}
.ait-dir-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ait-dir button {
  appearance: none; border: 0; background: transparent; color: var(--ait-text-3);
  width: 19px; height: 19px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer; padding: 0;
}
.ait-dir button:hover { background: var(--ait-red-soft); color: var(--ait-red); }
.ait-dir-add { border-style: dashed; color: var(--ait-text-2); padding: 4px 10px; cursor: pointer; background: transparent; }
.ait-dir-add:hover { border-color: var(--ait-accent); color: var(--ait-accent); }

.ait-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(292px, 1fr)); gap: 12px; }
.ait-card {
  position: relative; display: flex; flex-direction: column; gap: 10px;
  min-width: 0; padding: 16px;
  background: var(--ait-card); border: 0.5px solid var(--ait-border);
  border-radius: var(--ait-radius);
  transition: border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease;
}
.ait-card:hover { border-color: var(--ait-border-strong); box-shadow: 0 8px 24px rgba(0,0,0,0.07); transform: translateY(-1px); }
.ait-card[data-status="running"] { border-color: color-mix(in srgb, var(--ait-green) 34%, var(--ait-border)); }
.ait-card[data-status="starting"] { border-color: color-mix(in srgb, var(--ait-amber) 34%, var(--ait-border)); }
.ait-card[data-status="error"] { border-color: color-mix(in srgb, var(--ait-red) 32%, var(--ait-border)); }

.ait-card-top { display: flex; align-items: flex-start; gap: 10px; min-width: 0; }
.ait-icon {
  width: 40px; height: 40px; flex: none; border-radius: 12px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--ait-accent-soft); color: var(--ait-accent);
  font-size: 20px;
}
.ait-icon[data-kind="url"] { background: var(--ait-green-soft); color: var(--ait-green); }
.ait-icon[data-kind="app"] { background: var(--ait-amber-soft); color: var(--ait-amber); }
.ait-icon[data-kind="executable"] { background: var(--ait-fill); color: var(--ait-text-2); }
.ait-card-heading { min-width: 0; flex: 1; }
.ait-card-name { margin: 0; font-size: 15px; font-weight: 650; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ait-badges { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; }
.ait-badge {
  display: inline-flex; align-items: center; height: 19px; padding: 0 6px; border-radius: 5px;
  background: var(--ait-fill); color: var(--ait-text-2); font-size: 10.5px; font-weight: 520;
}
.ait-badge-kind { background: var(--ait-accent-soft); color: var(--ait-accent); }
.ait-badge-category { background: var(--ait-amber-soft); color: var(--ait-amber); }

.ait-star[data-active="true"] { color: var(--ait-amber); }
.ait-star:hover { color: var(--ait-amber); }
.ait-sort-note { margin: -6px 0 14px; color: var(--ait-text-3); font-size: 11px; }
.ait-status { display: inline-flex; align-items: center; gap: 5px; flex: none; font-size: 11px; color: var(--ait-text-2); padding-top: 3px; }
.ait-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--ait-text-3); flex: none; }
.ait-status[data-status="running"] .ait-dot { background: var(--ait-green); box-shadow: 0 0 0 3px var(--ait-green-soft); }
.ait-status[data-status="starting"] .ait-dot,
.ait-status[data-status="stopping"] .ait-dot { background: var(--ait-amber); animation: ait-pulse 1s ease-in-out infinite; }
.ait-status[data-status="error"] .ait-dot { background: var(--ait-red); }
.ait-status[data-status="opened"] .ait-dot,
.ait-status[data-status="external"] .ait-dot { background: var(--ait-accent); }

.ait-desc { margin: 0; color: var(--ait-text-2); font-size: 12.5px; line-height: 1.55; min-height: 38px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ait-path { color: var(--ait-text-3); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 10.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ait-run-line { display: flex; align-items: center; gap: 6px; min-width: 0; color: var(--ait-text-3); font-size: 11px; }
.ait-run-line code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 10.5px; background: var(--ait-fill); border-radius: 5px; padding: 2px 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ait-run-line a { color: var(--ait-accent); text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ait-run-line a:hover { text-decoration: underline; }
.ait-card-actions { display: flex; align-items: center; gap: 6px; margin-top: auto; padding-top: 3px; flex-wrap: wrap; }
.ait-card-actions .ait-spacer { flex: 1; }

.ait-empty { padding: 72px 20px; text-align: center; border: 1px dashed var(--ait-border-strong); border-radius: 20px; color: var(--ait-text-2); background: var(--ait-card); }
.ait-empty-icon { font-size: 40px; margin-bottom: 10px; }
.ait-empty h3 { margin: 0 0 6px; color: var(--ait-text); font-size: 16px; }
.ait-empty p { margin: 0 auto 16px; max-width: 440px; font-size: 13px; }

.ait-spinner { width: 12px; height: 12px; border: 1.6px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: ait-spin 0.7s linear infinite; flex: none; }
@keyframes ait-spin { to { transform: rotate(360deg); } }
@keyframes ait-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.38; } }

.ait-toast {
  position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%);
  z-index: 5000; max-width: min(560px, 90vw);
  padding: 10px 14px; border-radius: 10px;
  background: var(--dsw-alias-toast-bg, #222); color: var(--dsw-alias-toast-label, #fff);
  box-shadow: 0 10px 30px rgba(0,0,0,0.24); font-size: 12.5px;
  animation: ait-toast-in 160ms ease-out;
}
.ait-toast[data-kind="error"] { background: var(--ait-red); color: #fff; }
@keyframes ait-toast-in { from { opacity: 0; transform: translate(-50%, 8px); } }

.ait-overlay { position: fixed; inset: 0; z-index: 3000; background: rgba(0,0,0,0.30); }
.ait-drawer-backdrop { display: flex; justify-content: flex-end; }
.ait-drawer {
  width: min(660px, 95vw); height: 100%; display: flex; flex-direction: column;
  background: var(--ait-bg); color: var(--ait-text);
  box-shadow: -20px 0 60px rgba(0,0,0,0.25);
  animation: ait-slide-in 180ms ease-out;
}
@keyframes ait-slide-in { from { transform: translateX(24px); opacity: 0.6; } }
.ait-drawer-head { display: flex; align-items: flex-start; gap: 12px; padding: 20px 20px 14px; border-bottom: 0.5px solid var(--ait-border); }
.ait-drawer-title { margin: 0; font-size: 19px; font-weight: 660; line-height: 1.25; }
.ait-drawer-sub { color: var(--ait-text-2); font-size: 11.5px; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ait-tabs { display: flex; gap: 2px; padding: 8px 14px 0; border-bottom: 0.5px solid var(--ait-border); }
.ait-tab { appearance: none; border: 0; background: transparent; color: var(--ait-text-2); font: inherit; font-size: 12.5px; padding: 9px 10px; cursor: pointer; border-bottom: 2px solid transparent; }
.ait-tab[data-active="true"] { color: var(--ait-text); border-bottom-color: var(--ait-accent); }
.ait-drawer-body { flex: 1; overflow: auto; padding: 18px 20px 40px; }

.ait-kv { display: grid; grid-template-columns: 92px 1fr; gap: 8px 12px; font-size: 12.5px; align-items: start; }
.ait-kv dt { color: var(--ait-text-3); }
.ait-kv dd { margin: 0; color: var(--ait-text); min-width: 0; word-break: break-all; }
.ait-kv code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px; background: var(--ait-fill); padding: 2px 5px; border-radius: 5px; }
.ait-detail-actions { display: flex; gap: 7px; flex-wrap: wrap; margin: 2px 0 20px; }
.ait-section-title { font-size: 12px; font-weight: 650; color: var(--ait-text); margin: 22px 0 9px; display: flex; align-items: center; gap: 7px; }
.ait-section-title::after { content: ""; height: 1px; flex: 1; background: var(--ait-border); }
.ait-tags { display: flex; gap: 5px; flex-wrap: wrap; }

.ait-md { font-size: 13.5px; line-height: 1.72; color: var(--ait-text); overflow-wrap: anywhere; }
.ait-md > :first-child { margin-top: 0; }
.ait-md h1, .ait-md h2, .ait-md h3, .ait-md h4, .ait-md h5, .ait-md h6 { line-height: 1.3; margin: 1.45em 0 0.55em; font-weight: 660; letter-spacing: -0.012em; }
.ait-md h1 { font-size: 1.55em; }
.ait-md h2 { font-size: 1.3em; padding-bottom: 0.3em; border-bottom: 0.5px solid var(--ait-border); }
.ait-md h3 { font-size: 1.12em; }
.ait-md h4, .ait-md h5, .ait-md h6 { font-size: 1em; }
.ait-md p { margin: 0.7em 0; }
.ait-md a { color: var(--ait-accent); text-decoration: none; }
.ait-md a:hover { text-decoration: underline; }
.ait-md code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.88em; background: var(--ait-fill); padding: 0.14em 0.38em; border-radius: 4px; }
.ait-md pre { margin: 0.9em 0; padding: 12px 13px; border-radius: 10px; overflow: auto; background: var(--ait-card-strong); border: 0.5px solid var(--ait-border); }
.ait-md pre code { background: transparent; padding: 0; font-size: 11.5px; line-height: 1.55; }
.ait-md blockquote { margin: 0.9em 0; padding: 0.1em 0 0.1em 13px; border-left: 3px solid var(--ait-border-strong); color: var(--ait-text-2); }
.ait-md ul, .ait-md ol { margin: 0.6em 0; padding-left: 1.5em; }
.ait-md li { margin: 0.24em 0; }
.ait-md hr { border: 0; border-top: 0.5px solid var(--ait-border); margin: 1.4em 0; }
.ait-md table { width: 100%; border-collapse: collapse; margin: 0.9em 0; font-size: 12px; }
.ait-md th, .ait-md td { border: 0.5px solid var(--ait-border); padding: 6px 8px; text-align: left; vertical-align: top; }
.ait-md th { background: var(--ait-card-strong); font-weight: 620; }
.ait-md img, .ait-md-image { max-width: 100%; }
.ait-md-image { color: var(--ait-text-3); font-size: 11px; }
.ait-md input[type="checkbox"] { margin-right: 5px; }

.ait-logs {
  margin: 0; padding: 12px; min-height: 220px; max-height: calc(100vh - 260px);
  overflow: auto; white-space: pre-wrap; word-break: break-word;
  background: #111318; color: #d7dae0; border-radius: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px; line-height: 1.55;
}
.ait-log-empty { color: var(--ait-text-3); font-size: 12px; padding: 20px 0; }

.ait-modal-backdrop { display: flex; align-items: center; justify-content: center; padding: 24px; }
.ait-modal {
  width: min(540px, 94vw); max-height: 88vh; overflow: auto;
  background: var(--ait-bg); color: var(--ait-text); border-radius: 18px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.30); padding: 22px;
  animation: ait-modal-in 160ms ease-out;
}
@keyframes ait-modal-in { from { transform: translateY(8px) scale(0.985); opacity: 0.7; } }
.ait-modal h2 { margin: 0 0 4px; font-size: 19px; font-weight: 660; }
.ait-modal .ait-muted { color: var(--ait-text-2); font-size: 12px; margin: 0 0 16px; }
.ait-segment { display: inline-flex; gap: 2px; padding: 3px; border-radius: 9px; background: var(--ait-fill); margin-bottom: 16px; }
.ait-segment button { appearance: none; border: 0; background: transparent; color: var(--ait-text-2); border-radius: 7px; padding: 6px 11px; font: inherit; font-size: 12px; cursor: pointer; }
.ait-segment button[data-active="true"] { background: var(--ait-card); color: var(--ait-text); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }

.ait-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
.ait-field label { font-size: 11.5px; color: var(--ait-text-2); font-weight: 550; }
.ait-field input, .ait-field textarea {
  width: 100%; border: 0.5px solid var(--ait-border-strong); border-radius: 9px;
  background: var(--ait-card); color: var(--ait-text); font: inherit; font-size: 13px;
  padding: 9px 10px; outline: none; resize: vertical;
}
.ait-field input:focus, .ait-field textarea:focus { border-color: var(--ait-accent); box-shadow: 0 0 0 2px var(--ait-accent-soft); }
.ait-field-hint { color: var(--ait-text-3); font-size: 10.5px; }
.ait-form-actions { display: flex; justify-content: flex-end; gap: 7px; margin-top: 18px; }
.ait-form-actions .ait-spacer { flex: 1; }
.ait-form-error { color: var(--ait-red); font-size: 12px; margin-top: 8px; }
.ait-edit-modal { width: min(600px, 94vw); }
.ait-edit-path {
  display: block; padding: 8px 10px; border-radius: 8px; background: var(--ait-fill);
  color: var(--ait-text-2); font-size: 11px; overflow-wrap: anywhere;
}

.ait-preview-modal {
  width: min(1240px, 96vw); height: min(880px, 90vh); display: flex; flex-direction: column;
  background: var(--ait-bg); border-radius: 16px; overflow: hidden;
  box-shadow: 0 30px 100px rgba(0,0,0,0.36); animation: ait-modal-in 160ms ease-out;
}
.ait-preview-head { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-bottom: 0.5px solid var(--ait-border); flex: none; }
.ait-preview-title { font-size: 13px; font-weight: 620; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ait-preview-url { color: var(--ait-text-3); font-size: 10.5px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ait-preview-body { flex: 1; min-height: 0; background: #fff; }
.ait-preview-body iframe { width: 100%; height: 100%; border: 0; display: block; }
.ait-preview-note { padding: 6px 12px; color: var(--ait-text-3); background: var(--ait-card); font-size: 10.5px; border-top: 0.5px solid var(--ait-border); }

.ait-skeleton { border-radius: 8px; background: linear-gradient(90deg, var(--ait-fill) 25%, var(--ait-card-strong) 37%, var(--ait-fill) 63%); background-size: 400% 100%; animation: ait-shimmer 1.3s ease infinite; }
@keyframes ait-shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }

.ait-muted { color: var(--ait-text-2); }
.ait-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }

@media (max-width: 780px) {
  .ait-page { padding: 20px 14px 56px; }
  .ait-head { flex-direction: column; gap: 14px; }
  .ait-head-actions { justify-content: flex-start; }
  .ait-title { font-size: 23px; }
  .ait-grid { grid-template-columns: 1fr; }
  .ait-toolbar { align-items: stretch; }
  .ait-search { max-width: none; }
  .ait-drawer { width: 100vw; }
}`;

// src/client/index.jsx
var import_jsx_runtime = require("react/jsx-runtime");
var API = "ai-toolbox";
var STYLE_ID = "dsh-ai-toolbox-styles";
if (typeof document !== "undefined" && document.getElementById(STYLE_ID) === null) {
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.dataset.plugin = "dsh-ai-toolbox";
  style.textContent = STYLES;
  document.head.appendChild(style);
}
async function api(path, body) {
  let response;
  try {
    response = await fetch(`${API}/${path}`, {
      method: body === void 0 ? "GET" : "POST",
      headers: body === void 0 ? void 0 : { "content-type": "application/json" },
      body: body === void 0 ? void 0 : JSON.stringify(body),
      credentials: "same-origin",
      cache: "no-store"
    });
  } catch (error) {
    throw new Error(`\u65E0\u6CD5\u8FDE\u63A5\u672C\u5730AI\u5DE5\u5177\u7BB1\uFF1A${error?.message ?? error}`);
  }
  let payload = null;
  try {
    payload = await response.json();
  } catch {
  }
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error?.message || `\u8BF7\u6C42\u5931\u8D25\uFF08HTTP ${response.status}\uFF09`);
  }
  return payload;
}
function formatTime(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return "";
  }
}
var KIND_LABEL = { project: "\u9879\u76EE", url: "\u7F51\u5740", app: "\u5E94\u7528", executable: "\u53EF\u6267\u884C\u6587\u4EF6" };
var CATEGORY_ALL = "\u5168\u90E8";
var UNSORTED_CATEGORY = "\u672A\u5206\u7C7B";
var CATEGORY_OPTIONS = ["\u77E5\u8BC6\u5E93", "\u5DE5\u5177", "\u5C0F\u6E38\u620F", "\u5916\u90E8\u5DE5\u5177"];
var KIND_ICON = { project: "\u{1F916}", url: "\u{1F310}", app: "\u{1F5A5}\uFE0F", executable: "\u2318" };
var STATUS_LABEL = {
  stopped: "\u672A\u542F\u52A8",
  starting: "\u542F\u52A8\u4E2D",
  running: "\u8FD0\u884C\u4E2D",
  stopping: "\u505C\u6B62\u4E2D",
  error: "\u5F02\u5E38",
  opened: "\u5DF2\u6253\u5F00",
  external: "\u5916\u90E8\u8FD0\u884C"
};
function isLive(tool) {
  return ["running", "starting", "stopping"].includes(tool.runtime?.status);
}
function canManage(tool) {
  return (tool.kind === "project" || tool.kind === "executable") && Boolean(tool.launch?.command);
}
function canOpen(tool) {
  return Boolean(tool.url) || tool.kind === "app" || Boolean(tool.launch) || Boolean(tool.path);
}
function statusOf(tool) {
  return tool.runtime?.status || "stopped";
}
function Icon({ name: name2, size = 16 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true
  };
  if (name2 === "spark") {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { ...common, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 3.2l1.75 4.9L18.8 9.8l-5.05 1.7L12 16.5l-1.75-5L5.2 9.8l5.05-1.7L12 3.2Z" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M18.4 15.2l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" })
    ] });
  }
  if (name2 === "search") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { ...common, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "11", cy: "11", r: "6.5" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m16 16 4.2 4.2" })
  ] });
  if (name2 === "plus") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { ...common, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 5v14M5 12h14" }) });
  if (name2 === "refresh") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { ...common, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M20 11a8 8 0 1 0-2.2 5.6" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M20 4v7h-7" })
  ] });
  if (name2 === "play") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { ...common, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8 5.5v13l10-6.5L8 5.5Z" }) });
  if (name2 === "stop") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { ...common, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "7", y: "7", width: "10", height: "10", rx: "1.8" }) });
  if (name2 === "external") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { ...common, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M14 4h6v6" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M20 4 10 14" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" })
  ] });
  if (name2 === "book") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { ...common, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5v-13Z" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 18.5A2.5 2.5 0 0 1 6.5 16H20" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8 7h8M8 11h6" })
  ] });
  if (name2 === "edit") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { ...common, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 20h4L18.5 9.5a2.12 2.12 0 0 0-3-3L5 17v3Z" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m13.5 6.5 3 3" })
  ] });
  if (name2 === "star") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { ...common, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m12 3.7 2.6 5.25 5.8.84-4.2 4.1 1 5.77L12 16.93l-5.2 2.73 1-5.77-4.2-4.1 5.8-.84L12 3.7Z" }) });
  if (name2 === "starFilled") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { ...common, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m12 3.7 2.6 5.25 5.8.84-4.2 4.1 1 5.77L12 16.93l-5.2 2.73 1-5.77-4.2-4.1 5.8-.84L12 3.7Z", fill: "currentColor" }) });
  if (name2 === "terminal") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { ...common, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "3.5", y: "4.5", width: "17", height: "15", rx: "2.5" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m7.5 9 3 3-3 3M13 15h3.5" })
  ] });
  if (name2 === "close") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { ...common, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m6 6 12 12M18 6 6 18" }) });
  if (name2 === "trash") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { ...common, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13M10 11v5M14 11v5" }) });
  if (name2 === "copy") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { ...common, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "9", y: "9", width: "11", height: "11", rx: "2" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" })
  ] });
  if (name2 === "folder") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { ...common, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M3.5 7.5A2.5 2.5 0 0 1 6 5h3l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2.5 2.5 0 0 1-2.5-2.5v-9Z" }) });
  if (name2 === "chevron") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { ...common, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m9 6 6 6-6 6" }) });
  return null;
}
function SidebarIcon({ size = 18 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "3.2", y: "5.2", width: "17.6", height: "13.6", rx: "4", stroke: "currentColor", strokeWidth: "1.7" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8.2 10.4v3.2M5.9 12h4.6", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "15.4", cy: "11", r: "1.05", fill: "currentColor" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "18.1", cy: "11", r: "1.05", fill: "currentColor" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M15.2 14.1c.7.55 1.5.8 2.4.8", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" })
  ] });
}
function Status({ tool }) {
  const status = statusOf(tool);
  const pulse = status === "starting" || status === "stopping";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "ait-status", "data-status": status, title: tool.runtime?.message || STATUS_LABEL[status], children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-dot" }),
    pulse ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-spinner" }) : null,
    STATUS_LABEL[status] || status
  ] });
}
function ToolCard({ tool, busy, onStart, onStop, onOpen, onDetail, onFavorite }) {
  const status = statusOf(tool);
  const working = busy?.id === tool.id;
  const startable = canManage(tool);
  const openable = canOpen(tool);
  const launchLabel = tool.launch?.label || "";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { className: "ait-card", "data-status": status, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-card-top", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-icon", "data-kind": tool.kind, children: KIND_ICON[tool.kind] || "\u{1F916}" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-card-heading", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: "ait-card-name", title: tool.name, children: tool.name }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-badges", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-badge ait-badge-kind", children: KIND_LABEL[tool.kind] || tool.kind }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-badge ait-badge-category", children: tool.category || "\u672A\u5206\u7C7B" }),
          tool.origin === "manual" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-badge", children: "\u624B\u52A8\u6DFB\u52A0" }) : null,
          tool.edited ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-badge", children: "\u5DF2\u4FEE\u6539" }) : null,
          tool.hasReadme ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-badge", children: "README" }) : null,
          tool.tags?.slice(0, 1).map((tag) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-badge", children: tag }, tag))
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Status, { tool })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "ait-desc", title: tool.description, children: tool.description || "\u6682\u65E0\u4ECB\u7ECD" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-path", title: tool.path, children: tool.path }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-run-line", children: tool.url ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", { href: tool.url, target: "_blank", rel: "noreferrer noopener", title: tool.url, children: [
      "\u{1F517} ",
      tool.url
    ] }) : launchLabel ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { title: launchLabel, children: launchLabel }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u4EC5\u6587\u6863 / \u672A\u8BC6\u522B\u542F\u52A8\u547D\u4EE4" }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-card-actions", children: [
      startable ? isLive(tool) ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "ait-btn ait-btn-sm", disabled: working, onClick: () => onStop(tool), children: [
        working ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-spinner" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "stop", size: 14 }),
        "\u505C\u6B62"
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "ait-btn ait-btn-sm", disabled: working, onClick: () => onStart(tool), children: [
        working ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-spinner" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "play", size: 14 }),
        status === "error" ? "\u91CD\u65B0\u542F\u52A8" : "\u542F\u52A8"
      ] }) : tool.kind === "app" && status === "opened" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "ait-btn ait-btn-sm", disabled: working, onClick: () => onStop(tool), children: [
        working ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-spinner" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "stop", size: 14 }),
        "\u9000\u51FA\u5E94\u7528"
      ] }) : null,
      openable ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "ait-btn ait-btn-sm ait-btn-primary", disabled: working, onClick: () => onOpen(tool), children: [
        working ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-spinner" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "external", size: 14 }),
        "\u6253\u5F00"
      ] }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-spacer" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          className: "ait-btn ait-btn-sm ait-btn-icon ait-btn-ghost ait-star",
          "data-active": tool.favorite,
          onClick: () => onFavorite(tool),
          "aria-label": tool.favorite ? "\u53D6\u6D88\u6536\u85CF" : "\u6536\u85CF",
          title: tool.favorite ? "\u53D6\u6D88\u6536\u85CF" : "\u6536\u85CF\uFF0C\u7F6E\u9876\u663E\u793A",
          children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: tool.favorite ? "starFilled" : "star", size: 15 })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "ait-btn ait-btn-sm ait-btn-ghost", onClick: () => onDetail(tool), children: "\u8BE6\u60C5" })
    ] })
  ] });
}
function Markdown({ source }) {
  const html = (0, import_react.useMemo)(() => renderMarkdown(source), [source]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-md", dangerouslySetInnerHTML: { __html: html } });
}
function DetailDrawer({ tool, busy, onClose, onStart, onStop, onOpen, onReveal, onRemove, onEdit, onFavorite, showToast }) {
  const [tab, setTab] = (0, import_react.useState)("overview");
  const [readme, setReadme] = (0, import_react.useState)(null);
  const [readmeError, setReadmeError] = (0, import_react.useState)("");
  const [logs, setLogs] = (0, import_react.useState)(null);
  const [logsError, setLogsError] = (0, import_react.useState)("");
  const logRef = (0, import_react.useRef)(null);
  const working = busy?.id === tool.id;
  (0, import_react.useEffect)(() => {
    let cancelled = false;
    setReadme(null);
    setReadmeError("");
    if (tab !== "readme") return () => {
      cancelled = true;
    };
    api(`readme?id=${encodeURIComponent(tool.id)}`).then((payload) => {
      if (!cancelled) setReadme(payload);
    }).catch((error) => {
      if (!cancelled) setReadmeError(error.message);
    });
    return () => {
      cancelled = true;
    };
  }, [tab, tool.id]);
  const loadLogs = (0, import_react.useCallback)(() => {
    api(`logs?id=${encodeURIComponent(tool.id)}`).then((payload) => {
      setLogs(payload);
      setLogsError("");
      requestAnimationFrame(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
      });
    }).catch((error) => setLogsError(error.message));
  }, [tool.id]);
  (0, import_react.useEffect)(() => {
    if (tab !== "logs") return void 0;
    loadLogs();
    const timer = setInterval(loadLogs, 1200);
    return () => clearInterval(timer);
  }, [tab, loadLogs]);
  const copy = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast("\u5DF2\u590D\u5236");
    } catch {
      showToast("\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u9009\u62E9\u6587\u672C", "error");
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-overlay ait-drawer-backdrop", role: "presentation", onMouseDown: onClose, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", { className: "ait-drawer", role: "dialog", "aria-modal": "true", "aria-label": tool.name, onMouseDown: (event) => event.stopPropagation(), children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-drawer-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-icon", "data-kind": tool.kind, children: KIND_ICON[tool.kind] || "\u{1F916}" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { minWidth: 0, flex: 1 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "ait-drawer-title", children: tool.name }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-drawer-sub", title: tool.path, children: tool.path })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Status, { tool }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          className: "ait-btn ait-btn-sm ait-btn-icon ait-btn-ghost ait-star",
          "data-active": tool.favorite,
          onClick: () => onFavorite(tool),
          "aria-label": tool.favorite ? "\u53D6\u6D88\u6536\u85CF" : "\u6536\u85CF",
          title: tool.favorite ? "\u53D6\u6D88\u6536\u85CF" : "\u6536\u85CF\uFF0C\u7F6E\u9876\u663E\u793A",
          children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: tool.favorite ? "starFilled" : "star", size: 16 })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "ait-btn ait-btn-sm ait-btn-icon ait-btn-ghost", onClick: () => onEdit(tool), "aria-label": "\u7F16\u8F91\u914D\u7F6E", title: "\u7F16\u8F91\u914D\u7F6E", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "edit", size: 16 }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "ait-btn ait-btn-sm ait-btn-icon ait-btn-ghost", onClick: onClose, "aria-label": "\u5173\u95ED", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "close", size: 16 }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-tabs", role: "tablist", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "ait-tab", "data-active": tab === "overview", onClick: () => setTab("overview"), role: "tab", children: "\u6982\u89C8" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "ait-tab", "data-active": tab === "readme", onClick: () => setTab("readme"), role: "tab", children: "README" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "ait-tab", "data-active": tab === "logs", onClick: () => setTab("logs"), role: "tab", children: "\u65E5\u5FD7" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-drawer-body", children: [
      tab === "overview" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-detail-actions", children: [
          canManage(tool) ? isLive(tool) ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "ait-btn", disabled: working, onClick: () => onStop(tool), children: [
            working ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-spinner" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "stop", size: 15 }),
            " \u505C\u6B62"
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "ait-btn", disabled: working, onClick: () => onStart(tool), children: [
            working ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-spinner" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "play", size: 15 }),
            " \u542F\u52A8"
          ] }) : tool.kind === "app" && statusOf(tool) === "opened" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "ait-btn", disabled: working, onClick: () => onStop(tool), children: [
            working ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-spinner" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "stop", size: 15 }),
            " \u9000\u51FA\u5E94\u7528"
          ] }) : null,
          canOpen(tool) ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "ait-btn ait-btn-primary", disabled: working, onClick: () => onOpen(tool), children: [
            working ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-spinner" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "external", size: 15 }),
            " \u6253\u5F00"
          ] }) : null,
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "ait-btn", disabled: working, onClick: () => onEdit(tool), children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "edit", size: 15 }),
            " \u7F16\u8F91\u914D\u7F6E"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "ait-btn", disabled: working, onClick: () => onReveal(tool), children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "folder", size: 15 }),
            " \u663E\u793A\u4F4D\u7F6E"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "ait-btn ait-btn-danger", disabled: working, onClick: () => onRemove(tool), children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "trash", size: 15 }),
            " \u79FB\u9664"
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", { className: "ait-kv", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "\u4ECB\u7ECD" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: tool.description || "\u6682\u65E0\u4ECB\u7ECD" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "\u7C7B\u578B" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dd", { children: [
            KIND_LABEL[tool.kind] || tool.kind,
            tool.origin === "manual" ? " \xB7 \u624B\u52A8\u6DFB\u52A0" : " \xB7 \u626B\u63CF\u53D1\u73B0",
            tool.edited ? " \xB7 \u5DF2\u4FEE\u6539" : ""
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "\u5206\u7C7B" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: tool.category || "\u672A\u5206\u7C7B" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "\u8DEF\u5F84" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: tool.path }) }),
          tool.launch ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "\u542F\u52A8\u547D\u4EE4" }) : null,
          tool.launch ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dd", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: tool.launch.label }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "ait-muted", children: [
              "\u5DE5\u4F5C\u76EE\u5F55\uFF1A",
              tool.launch.cwd
            ] })
          ] }) : null,
          tool.url ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "\u8BBF\u95EE\u5730\u5740" }) : null,
          tool.url ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dd", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { href: tool.url, target: "_blank", rel: "noreferrer noopener", children: tool.url }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "ait-btn ait-btn-sm ait-btn-ghost", onClick: () => copy(tool.url), children: "\u590D\u5236" })
          ] }) : null,
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "\u72B6\u6001" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dd", { children: [
            STATUS_LABEL[statusOf(tool)] || statusOf(tool),
            tool.runtime?.message ? ` \xB7 ${tool.runtime.message}` : ""
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "\u6700\u8FD1\u4F7F\u7528" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: tool.lastUsedAt ? formatTime(tool.lastUsedAt) : "\u5C1A\u672A\u4F7F\u7528" }),
          tool.runtime?.startedAt ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "\u542F\u52A8\u65F6\u95F4" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: formatTime(tool.runtime.startedAt) })
          ] }) : null,
          tool.runtime?.exitCode != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "\u9000\u51FA\u7801" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: tool.runtime.exitCode })
          ] }) : null
        ] }),
        tool.tags?.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-section-title", children: "\u6807\u7B7E" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-tags", children: tool.tags.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-badge", children: tag }, tag)) })
        ] }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-section-title", children: "README" }),
        tool.hasReadme ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "ait-btn", onClick: () => setTab("readme"), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "book", size: 15 }),
          " \u9605\u8BFB README"
        ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-muted", children: "\u8FD9\u4E2A\u9879\u76EE\u6CA1\u6709 README\u3002" })
      ] }) : null,
      tab === "readme" ? readmeError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-form-error", children: readmeError }) : readme === null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-skeleton", style: { height: 220 } }) : readme.missing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-log-empty", children: "\u6CA1\u6709\u627E\u5230 README \u6587\u4EF6\u3002" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-muted", style: { fontSize: 11, marginBottom: 12 }, children: [
          readme.path,
          readme.truncated ? " \xB7 \u4EC5\u663E\u793A\u524D 512 KB" : ""
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Markdown, { source: readme.markdown })
      ] }) : null,
      tab === "logs" ? logsError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-form-error", children: logsError }) : logs === null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-skeleton", style: { height: 220 } }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-detail-actions", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "ait-btn ait-btn-sm", onClick: loadLogs, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "refresh", size: 14 }),
            " \u5237\u65B0\u65E5\u5FD7"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-muted", style: { fontSize: 11 }, children: logs.message || STATUS_LABEL[logs.status] || logs.status })
        ] }),
        logs.logs ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { className: "ait-logs", ref: logRef, children: logs.logs }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-log-empty", children: "\u6682\u65E0\u65E5\u5FD7\u3002\u542F\u52A8\u8FD9\u4E2A\u5DE5\u5177\u540E\uFF0C\u8F93\u51FA\u4F1A\u663E\u793A\u5728\u8FD9\u91CC\u3002" })
      ] }) : null
    ] })
  ] }) });
}
function AddDialog({ initialMode, onClose, onDone, showToast }) {
  const [mode, setMode] = (0, import_react.useState)(initialMode || "directory");
  const [form, setForm] = (0, import_react.useState)({
    path: "",
    name: "",
    args: "",
    cwd: "",
    url: "",
    description: "",
    category: ""
  });
  const [submitting, setSubmitting] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)("");
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      let result;
      if (mode === "directory") {
        result = await api("add-directory", { path: form.path });
      } else if (mode === "url") {
        result = await api("add", {
          mode: "url",
          name: form.name,
          url: form.url,
          description: form.description,
          category: form.category
        });
      } else {
        result = await api("add", {
          mode: "executable",
          name: form.name,
          path: form.path,
          args: form.args,
          cwd: form.cwd,
          url: form.url,
          description: form.description,
          category: form.category
        });
      }
      showToast(mode === "directory" ? "\u76EE\u5F55\u5DF2\u6DFB\u52A0\u5E76\u626B\u63CF" : "\u5DE5\u5177\u5DF2\u6DFB\u52A0");
      onDone(result.state);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-overlay ait-modal-backdrop", onMouseDown: onClose, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { className: "ait-modal", onSubmit: submit, onMouseDown: (event) => event.stopPropagation(), children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "\u6DFB\u52A0\u672C\u5730 AI \u5DE5\u5177" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "ait-muted", children: "\u6DFB\u52A0\u9879\u76EE\u76EE\u5F55\u3001\u53EF\u6267\u884C\u6587\u4EF6\u6216\u4E00\u4E2A\u7F51\u5740\u3002\u626B\u63CF\u53EA\u4F1A\u8BFB\u53D6\u76EE\u5F55\uFF0C\u4E0D\u4F1A\u4FEE\u6539\u9879\u76EE\u6587\u4EF6\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-segment", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", "data-active": mode === "directory", onClick: () => setMode("directory"), children: "\u9879\u76EE\u76EE\u5F55" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", "data-active": mode === "executable", onClick: () => setMode("executable"), children: "\u53EF\u6267\u884C\u6587\u4EF6 / \u5E94\u7528" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", "data-active": mode === "url", onClick: () => setMode("url"), children: "\u7F51\u5740" })
    ] }),
    mode === "directory" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "ait-dir-path", children: "\u76EE\u5F55\u7EDD\u5BF9\u8DEF\u5F84" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          id: "ait-dir-path",
          autoFocus: true,
          value: form.path,
          onChange: update("path"),
          placeholder: "\u4F8B\u5982 /Users/me/Documents/deepseek-harness"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-field-hint", children: "\u4F1A\u626B\u63CF\u8BE5\u76EE\u5F55\u672C\u8EAB\u548C\u4E0B\u4E00\u5C42\u5B50\u76EE\u5F55\u4E2D\u7684\u9879\u76EE\uFF0C\u5E76\u81EA\u52A8\u8BC6\u522B\u542F\u52A8\u547D\u4EE4\u548C localhost \u5730\u5740\u3002" })
    ] }) : null,
    mode === "executable" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "ait-exe-path", children: "\u6587\u4EF6\u6216 .app \u8DEF\u5F84" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { id: "ait-exe-path", autoFocus: true, value: form.path, onChange: update("path"), placeholder: "\u4F8B\u5982 /Applications/MyTool.app \u6216 /path/to/run.sh" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-field-hint", children: "\u652F\u6301 macOS .app\u3001\u4E8C\u8FDB\u5236\u6587\u4EF6\u3001.command / .sh \u811A\u672C\uFF0C\u4E5F\u652F\u6301\u4E00\u4E2A\u9879\u76EE\u76EE\u5F55\u3002" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "ait-exe-name", children: "\u663E\u793A\u540D\u79F0\uFF08\u53EF\u9009\uFF09" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { id: "ait-exe-name", value: form.name, onChange: update("name"), placeholder: "\u9ED8\u8BA4\u4F7F\u7528\u6587\u4EF6\u540D" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "ait-exe-args", children: "\u542F\u52A8\u53C2\u6570\uFF08\u53EF\u9009\uFF09" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { id: "ait-exe-args", value: form.args, onChange: update("args"), placeholder: "\u4F8B\u5982 --port 3000 --host 127.0.0.1" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "ait-exe-cwd", children: "\u5DE5\u4F5C\u76EE\u5F55\uFF08\u53EF\u9009\uFF09" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { id: "ait-exe-cwd", value: form.cwd, onChange: update("cwd"), placeholder: "\u9ED8\u8BA4\u4F7F\u7528\u6587\u4EF6\u6240\u5728\u76EE\u5F55" })
      ] })
    ] }) : null,
    mode === "url" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "ait-url", children: "\u7F51\u5740" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { id: "ait-url", autoFocus: true, value: form.url, onChange: update("url"), placeholder: "http://localhost:3000" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "ait-url-name", children: "\u663E\u793A\u540D\u79F0\uFF08\u53EF\u9009\uFF09" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { id: "ait-url-name", value: form.name, onChange: update("name"), placeholder: "\u4F8B\u5982 \u6211\u7684\u56FE\u50CF\u751F\u6210\u5668" })
      ] })
    ] }) : null,
    mode !== "directory" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      mode === "executable" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "ait-exe-url", children: "\u7F51\u9875\u5730\u5740\uFF08\u53EF\u9009\uFF09" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { id: "ait-exe-url", value: form.url, onChange: update("url"), placeholder: "\u5982\u679C\u8FD9\u4E2A\u7A0B\u5E8F\u4F1A\u542F\u52A8\u672C\u5730\u7F51\u9875\uFF0C\u53EF\u586B http://localhost:..." })
      ] }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "ait-category", children: "\u5206\u7C7B\uFF08\u53EF\u9009\uFF09" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            id: "ait-category",
            list: "ait-category-options",
            value: form.category,
            onChange: update("category"),
            placeholder: "\u4F8B\u5982 \u77E5\u8BC6\u5E93\u3001\u5DE5\u5177\u3001\u5C0F\u6E38\u620F\u3001\u5916\u90E8\u5DE5\u5177"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("datalist", { id: "ait-category-options", children: CATEGORY_OPTIONS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: item }, item)) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-field-hint", children: "\u7559\u7A7A\u4F1A\u81EA\u52A8\u8BC6\u522B\uFF1B\u4E5F\u53EF\u4EE5\u8F93\u5165\u81EA\u5B9A\u4E49\u5206\u7C7B\uFF0C\u4E4B\u540E\u5728\u9876\u90E8\u6309\u5206\u7C7B\u7B5B\u9009\u3002" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "ait-desc", children: "\u4ECB\u7ECD\uFF08\u53EF\u9009\uFF09" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { id: "ait-desc", rows: 3, value: form.description, onChange: update("description"), placeholder: "\u4E00\u53E5\u8BDD\u8BF4\u660E\u8FD9\u4E2A\u5DE5\u5177\u80FD\u505A\u4EC0\u4E48" })
      ] })
    ] }) : null,
    error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-form-error", children: error }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-form-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "ait-btn", onClick: onClose, disabled: submitting, children: "\u53D6\u6D88" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { type: "submit", className: "ait-btn ait-btn-primary", disabled: submitting || (mode === "directory" ? !form.path.trim() : mode === "url" ? !form.url.trim() : !form.path.trim()), children: [
        submitting ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-spinner" }) : null,
        mode === "directory" ? "\u6DFB\u52A0\u5E76\u626B\u63CF" : "\u6DFB\u52A0"
      ] })
    ] })
  ] }) });
}
function quoteArg(value) {
  const text = String(value);
  if (!/[\s"']/.test(text)) return text;
  if (!text.includes('"')) return `"${text}"`;
  if (!text.includes("'")) return `'${text}'`;
  return `"${text.replace(/"/g, "")}"`;
}
function formatArgs(args) {
  return (args ?? []).map(quoteArg).join(" ");
}
function EditDialog({ tool, onClose, onSaved, showToast }) {
  const canUrl = tool.kind !== "app";
  const canPath = tool.kind !== "url";
  const canCommand = tool.kind === "project";
  const canArgs = tool.kind === "executable";
  const pathLabel = tool.kind === "project" ? "\u9879\u76EE\u76EE\u5F55" : "\u6587\u4EF6\u6216 .app \u8DEF\u5F84";
  const [form, setForm] = (0, import_react.useState)({
    name: tool.name || "",
    description: tool.description || "",
    category: tool.category || "\u672A\u5206\u7C7B",
    path: tool.path || "",
    command: tool.launch?.label || "",
    args: formatArgs(tool.launch?.args),
    cwd: tool.launch?.cwd || "",
    url: tool.url || ""
  });
  const [submitting, setSubmitting] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)("");
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A");
      return;
    }
    const patch = {
      id: tool.id,
      name: form.name,
      description: form.description
    };
    if (form.category.trim() !== (tool.category || "\u672A\u5206\u7C7B")) patch.category = form.category;
    if (canPath && form.path.trim() !== (tool.path || "")) patch.path = form.path;
    if (canCommand && form.command.trim() !== (tool.launch?.label || "")) patch.command = form.command;
    if (canArgs && form.args.trim() !== formatArgs(tool.launch?.args)) patch.args = form.args;
    if ((canCommand || canArgs) && form.cwd.trim() !== (tool.launch?.cwd || "")) patch.cwd = form.cwd;
    if (canUrl && (tool.kind === "url" || form.url.trim() !== (tool.url || ""))) {
      patch.url = form.url;
    }
    setSubmitting(true);
    try {
      const payload = await api("update", patch);
      onSaved(payload);
      showToast(payload.tool?.runtime?.message || "\u914D\u7F6E\u5DF2\u4FDD\u5B58");
      onClose();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };
  const reset = async () => {
    if (!window.confirm("\u6062\u590D\u81EA\u52A8\u8BC6\u522B\u4F1A\u4E22\u5F03\u8FD9\u4E2A\u5DE5\u5177\u7684\u540D\u79F0\u3001\u4ECB\u7ECD\u3001\u5206\u7C7B\u3001\u8DEF\u5F84\u3001\u542F\u52A8\u547D\u4EE4\u548C\u7F51\u5740\u4FEE\u6539\uFF0C\u786E\u5B9A\u7EE7\u7EED\uFF1F")) return;
    setError("");
    setSubmitting(true);
    try {
      const payload = await api("reset", { id: tool.id });
      onSaved(payload);
      showToast("\u5DF2\u6062\u590D\u81EA\u52A8\u8BC6\u522B");
      onClose();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-overlay ait-modal-backdrop", onMouseDown: onClose, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { className: "ait-modal ait-edit-modal", onSubmit: submit, onMouseDown: (event) => event.stopPropagation(), children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "\u7F16\u8F91\u5DE5\u5177\u914D\u7F6E" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "ait-muted", children: "\u4FEE\u6539\u8DEF\u5F84\u3001\u542F\u52A8\u547D\u4EE4\u6216\u5DE5\u4F5C\u76EE\u5F55\u540E\uFF0C\u5982\u679C\u5DE5\u5177\u6B63\u5728\u8FD0\u884C\uFF0C\u8BF7\u505C\u6B62\u540E\u91CD\u65B0\u542F\u52A8\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "ait-edit-name", children: "\u540D\u79F0" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { id: "ait-edit-name", autoFocus: true, value: form.name, onChange: update("name"), placeholder: "\u5DE5\u5177\u663E\u793A\u540D\u79F0" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "ait-edit-description", children: "\u4ECB\u7ECD" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { id: "ait-edit-description", rows: 3, value: form.description, onChange: update("description"), placeholder: "\u4E00\u53E5\u8BDD\u8BF4\u660E\u8FD9\u4E2A\u5DE5\u5177\u80FD\u505A\u4EC0\u4E48" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "ait-edit-category", children: "\u5206\u7C7B" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          id: "ait-edit-category",
          list: "ait-edit-category-options",
          value: form.category,
          onChange: update("category"),
          placeholder: "\u4F8B\u5982 \u77E5\u8BC6\u5E93\u3001\u5DE5\u5177\u3001\u5C0F\u6E38\u620F\u3001\u5916\u90E8\u5DE5\u5177"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("datalist", { id: "ait-edit-category-options", children: [...CATEGORY_OPTIONS, tool.category].filter(Boolean).filter((item, index, list) => list.indexOf(item) === index).map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: item }, item)) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-field-hint", children: "\u5206\u7C7B\u4F1A\u663E\u793A\u5728\u5361\u7247\u548C\u8BE6\u60C5\u91CC\uFF1B\u9876\u90E8\u53EF\u6309\u5206\u7C7B\u7B5B\u9009\uFF0C\u7559\u7A7A\u4FDD\u5B58\u4E3A\u300C\u672A\u5206\u7C7B\u300D\u3002" })
    ] }),
    canPath ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "ait-edit-path", children: pathLabel }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { id: "ait-edit-path", value: form.path, onChange: update("path"), placeholder: tool.kind === "project" ? "/path/to/project" : "/path/to/tool", spellCheck: false }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-field-hint", children: "\u4FEE\u6539\u540E\u4F1A\u7ACB\u5373\u7528\u4E8E\u6253\u5F00\u548C\u542F\u52A8\uFF1B\u626B\u63CF\u53D1\u73B0\u7684\u9879\u76EE\u6539\u8DEF\u5F84\u540E\uFF0C\u91CD\u65B0\u626B\u63CF\u4E5F\u4E0D\u4F1A\u4E22\u5931\u3002" })
    ] }) : null,
    canCommand ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "ait-edit-command", children: "\u542F\u52A8\u547D\u4EE4\uFF08\u542B\u53C2\u6570\uFF09" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          id: "ait-edit-command",
          value: form.command,
          onChange: update("command"),
          placeholder: "\u4F8B\u5982 npm run dev \u6216 python3 app.py"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-field-hint", children: "\u6309 argv \u6267\u884C\uFF1B\u5E26\u7A7A\u683C\u7684\u8DEF\u5F84\u6216\u53C2\u6570\u8BF7\u7528\u5F15\u53F7\u3002\u7559\u7A7A\u4FDD\u6301\u5F53\u524D\u81EA\u52A8\u8BC6\u522B\u7ED3\u679C\u3002" })
    ] }) : null,
    canArgs ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "ait-edit-args", children: "\u542F\u52A8\u53C2\u6570" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          id: "ait-edit-args",
          value: form.args,
          onChange: update("args"),
          placeholder: "\u4F8B\u5982 --ui=true --port=9749",
          spellCheck: false
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-field-hint", children: "\u53EA\u586B\u53C2\u6570\uFF0C\u4E0D\u8981\u586B\u53EF\u6267\u884C\u6587\u4EF6\u8DEF\u5F84\uFF1B\u53EF\u6267\u884C\u6587\u4EF6\u7531\u4E0A\u9762\u7684\u8DEF\u5F84\u51B3\u5B9A\u3002" })
    ] }) : null,
    canCommand || canArgs ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "ait-edit-cwd", children: "\u5DE5\u4F5C\u76EE\u5F55" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { id: "ait-edit-cwd", value: form.cwd, onChange: update("cwd"), placeholder: tool.path }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-field-hint", children: "\u5FC5\u987B\u662F\u4E00\u4E2A\u5DF2\u5B58\u5728\u7684\u76EE\u5F55\uFF1B\u7559\u7A7A\u4F7F\u7528\u9879\u76EE\u76EE\u5F55\u6216\u53EF\u6267\u884C\u6587\u4EF6\u6240\u5728\u76EE\u5F55\u3002" })
    ] }) : null,
    canUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "ait-edit-url", children: "\u7F51\u9875\u5730\u5740" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { id: "ait-edit-url", value: form.url, onChange: update("url"), placeholder: "http://localhost:3000" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-field-hint", children: "\u7528\u4E8E\u300C\u6253\u5F00\u300D\u548C\u5361\u7247\u4E0A\u7684\u7F51\u5740\uFF1B\u7559\u7A7A\u8868\u793A\u4E0D\u4F7F\u7528\u56FA\u5B9A\u7F51\u5740\u3002" })
    ] }) : null,
    tool.origin === "scan" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-field-hint", children: "\u8FD9\u662F\u626B\u63CF\u53D1\u73B0\u7684\u9879\u76EE\uFF0C\u4E0A\u9762\u7684\u4FEE\u6539\u4F1A\u8986\u76D6\u81EA\u52A8\u8BC6\u522B\u7ED3\u679C\uFF0C\u591A\u6B21\u91CD\u65B0\u626B\u63CF\u4E5F\u4E0D\u4F1A\u4E22\u5931\u3002" }) : null,
    error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-form-error", children: error }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-form-actions", children: [
      tool.origin === "scan" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "ait-btn", onClick: reset, disabled: submitting, children: "\u6062\u590D\u81EA\u52A8\u8BC6\u522B" }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-spacer" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "ait-btn", onClick: onClose, disabled: submitting, children: "\u53D6\u6D88" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { type: "submit", className: "ait-btn ait-btn-primary", disabled: submitting, children: [
        submitting ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-spinner" }) : null,
        " \u4FDD\u5B58"
      ] })
    ] })
  ] }) });
}
function PreviewModal({ preview, onClose }) {
  const openExternal = () => window.open(preview.url, "_blank", "noopener,noreferrer");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-overlay ait-modal-backdrop", onMouseDown: onClose, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-preview-modal", onMouseDown: (event) => event.stopPropagation(), children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-preview-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-icon", style: { width: 30, height: 30, fontSize: 15 }, children: "\u{1F310}" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { minWidth: 0, flex: 1 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-preview-title", children: preview.name }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-preview-url", children: preview.url })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "ait-btn ait-btn-sm", onClick: openExternal, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "external", size: 14 }),
        " \u65B0\u6807\u7B7E\u9875"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "ait-btn ait-btn-sm ait-btn-icon ait-btn-ghost", onClick: onClose, "aria-label": "\u5173\u95ED", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "close", size: 16 }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-preview-body", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("iframe", { src: preview.url, title: preview.name, allow: "clipboard-read; clipboard-write; fullscreen", referrerPolicy: "no-referrer" }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-preview-note", children: "\u5982\u679C\u9875\u9762\u7A7A\u767D\u6216\u52A0\u8F7D\u88AB\u62D2\u7EDD\uFF0C\u901A\u5E38\u662F\u8BE5\u5DE5\u5177\u7981\u6B62\u88AB iframe \u5D4C\u5165\uFF0C\u8BF7\u70B9\u53F3\u4E0A\u89D2\u300C\u65B0\u6807\u7B7E\u9875\u300D\u3002" })
  ] }) });
}
function Toast({ toast }) {
  if (!toast) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-toast", "data-kind": toast.kind || "info", children: toast.message });
}
function EmptyState({ hasDirectories, hasFilters, onAdd, onClear }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-empty", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-empty-icon", children: "\u{1F9F0}" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: hasFilters ? "\u5F53\u524D\u7B5B\u9009\u4E0B\u6CA1\u6709\u5DE5\u5177" : hasDirectories ? "\u8FD9\u4E9B\u76EE\u5F55\u91CC\u8FD8\u6CA1\u6709\u626B\u63CF\u5230\u9879\u76EE" : "\u5148\u6DFB\u52A0\u4E00\u4E2A\u9879\u76EE\u76EE\u5F55" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: hasFilters ? "\u6362\u4E00\u4E2A\u5206\u7C7B\u6216\u641C\u7D22\u8BCD\u8BD5\u8BD5\uFF0C\u4E5F\u53EF\u4EE5\u6E05\u9664\u7B5B\u9009\u67E5\u770B\u5168\u90E8\u5DE5\u5177\u3002" : hasDirectories ? "\u9879\u76EE\u9700\u8981\u5305\u542B README\u3001package.json\u3001pyproject.toml \u6216\u5165\u53E3\u811A\u672C\u3002\u4E5F\u53EF\u4EE5\u76F4\u63A5\u6DFB\u52A0\u4E00\u4E2A\u53EF\u6267\u884C\u6587\u4EF6\u6216\u672C\u5730\u7F51\u5740\u3002" : "\u9009\u62E9\u4E00\u4E2A\u4F60\u5E73\u65F6\u7528 agent \u5F00\u53D1 AI \u5DE5\u5177\u7684\u76EE\u5F55\uFF0C\u63D2\u4EF6\u4F1A\u626B\u63CF\u5176\u4E2D\u7684\u9879\u76EE\u5E76\u81EA\u52A8\u8BC6\u522B\u542F\u52A8\u65B9\u5F0F\u3002" }),
    hasFilters ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "ait-btn ait-btn-primary", onClick: onClear, children: "\u663E\u793A\u5168\u90E8\u5DE5\u5177" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "ait-btn ait-btn-primary", onClick: onAdd, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "plus", size: 15 }),
      " \u6DFB\u52A0\u76EE\u5F55"
    ] })
  ] });
}
function App() {
  const [data, setData] = (0, import_react.useState)(null);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [loadError, setLoadError] = (0, import_react.useState)("");
  const [query, setQuery] = (0, import_react.useState)("");
  const [filter, setFilter] = (0, import_react.useState)("all");
  const [category, setCategory] = (0, import_react.useState)(CATEGORY_ALL);
  const [busy, setBusy] = (0, import_react.useState)(null);
  const [detailId, setDetailId] = (0, import_react.useState)(null);
  const [addMode, setAddMode] = (0, import_react.useState)(null);
  const [editingId, setEditingId] = (0, import_react.useState)(null);
  const [preview, setPreview] = (0, import_react.useState)(null);
  const [toast, setToast] = (0, import_react.useState)(null);
  const toastTimer = (0, import_react.useRef)(null);
  const showToast = (0, import_react.useCallback)((message, kind = "info") => {
    setToast({ message, kind });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);
  (0, import_react.useEffect)(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);
  const load = (0, import_react.useCallback)(async (quiet = false) => {
    try {
      const payload = await api("state");
      setData(payload.state);
      setLoadError("");
    } catch (error) {
      if (!quiet) setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);
  (0, import_react.useEffect)(() => {
    void load();
  }, [load]);
  (0, import_react.useEffect)(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 2500);
    return () => clearInterval(timer);
  }, [load]);
  const act = (0, import_react.useCallback)(async (tool, path, extra = {}) => {
    setBusy({ id: tool.id, action: path });
    try {
      const payload = await api(path, { id: tool.id, ...extra });
      if (payload.state) setData(payload.state);
      return payload;
    } catch (error) {
      showToast(error.message, "error");
      return null;
    } finally {
      setBusy(null);
    }
  }, [showToast]);
  const handleStart = (0, import_react.useCallback)(async (tool) => {
    const payload = await act(tool, "start");
    if (payload) showToast(`${tool.name} \u5DF2\u542F\u52A8`);
  }, [act, showToast]);
  const handleStop = (0, import_react.useCallback)(async (tool) => {
    const payload = await act(tool, "stop");
    if (payload) showToast(`${tool.name} \u5DF2\u505C\u6B62`);
  }, [act, showToast]);
  const handleOpen = (0, import_react.useCallback)(async (tool) => {
    const payload = await act(tool, "open");
    if (!payload) return;
    if (payload.url) {
      setPreview({ url: payload.url, name: tool.name });
    } else if (payload.revealed) {
      showToast(payload.message || "\u5DF2\u5728\u6587\u4EF6\u7BA1\u7406\u5668\u4E2D\u663E\u793A");
    } else {
      showToast(payload.message || "\u5DF2\u542F\u52A8");
    }
  }, [act, showToast]);
  const handleReveal = (0, import_react.useCallback)(async (tool) => {
    const payload = await act(tool, "reveal");
    if (payload) showToast("\u5DF2\u5728\u6587\u4EF6\u7BA1\u7406\u5668\u4E2D\u663E\u793A");
  }, [act, showToast]);
  const handleFavorite = (0, import_react.useCallback)(async (tool) => {
    const payload = await act(tool, "favorite", { favorite: !tool.favorite });
    if (payload) showToast(tool.favorite ? "\u5DF2\u53D6\u6D88\u6536\u85CF" : "\u5DF2\u6536\u85CF\uFF0C\u5DF2\u7F6E\u9876");
  }, [act, showToast]);
  const handleRemove = (0, import_react.useCallback)(async (tool) => {
    const prompt = tool.origin === "scan" ? `\u4ECE\u5217\u8868\u79FB\u9664\u300C${tool.name}\u300D\uFF1F\u4E0D\u4F1A\u5220\u9664\u78C1\u76D8\u6587\u4EF6\uFF0C\u91CD\u65B0\u626B\u63CF\u524D\u5B83\u4F1A\u4FDD\u6301\u9690\u85CF\u3002` : `\u4ECE\u5217\u8868\u79FB\u9664\u300C${tool.name}\u300D\uFF1F\u4E0D\u4F1A\u5220\u9664\u78C1\u76D8\u6587\u4EF6\u3002`;
    if (!window.confirm(prompt)) return;
    const payload = await act(tool, "remove");
    if (payload) {
      setDetailId(null);
      showToast("\u5DF2\u4ECE\u5217\u8868\u79FB\u9664");
    }
  }, [act, showToast]);
  const handleRemoveDirectory = (0, import_react.useCallback)(async (directory) => {
    if (!window.confirm(`\u79FB\u9664\u76EE\u5F55\u300C${directory.label}\u300D\uFF1F\u4E0D\u4F1A\u5220\u9664\u78C1\u76D8\u6587\u4EF6\uFF0C\u8BE5\u76EE\u5F55\u4E0B\u626B\u63CF\u51FA\u7684\u9879\u76EE\u4F1A\u4ECE\u5217\u8868\u6D88\u5931\u3002`)) return;
    setBusy({ id: directory.id, action: "remove-directory" });
    try {
      const payload = await api("remove-directory", { id: directory.id });
      if (payload.state) setData(payload.state);
      showToast("\u76EE\u5F55\u5DF2\u79FB\u9664");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setBusy(null);
    }
  }, [showToast]);
  const handleRescan = (0, import_react.useCallback)(async () => {
    setBusy({ id: "rescan", action: "rescan" });
    try {
      const payload = await api("rescan", {});
      if (payload.state) setData(payload.state);
      showToast("\u5DF2\u91CD\u65B0\u626B\u63CF\u76EE\u5F55");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setBusy(null);
    }
  }, [showToast]);
  const tools = data?.tools ?? [];
  const categories = (0, import_react.useMemo)(() => {
    const names = new Set(CATEGORY_OPTIONS);
    for (const tool of tools) names.add(tool.category || UNSORTED_CATEGORY);
    const extra = [...names].filter((item) => !CATEGORY_OPTIONS.includes(item)).sort((left, right) => left.localeCompare(right, "zh-Hans-CN"));
    return [CATEGORY_ALL, ...CATEGORY_OPTIONS, ...extra];
  }, [tools]);
  const categoryCounts = (0, import_react.useMemo)(() => {
    const counts2 = /* @__PURE__ */ new Map([[CATEGORY_ALL, tools.length]]);
    for (const tool of tools) {
      const name2 = tool.category || UNSORTED_CATEGORY;
      counts2.set(name2, (counts2.get(name2) || 0) + 1);
    }
    return counts2;
  }, [tools]);
  (0, import_react.useEffect)(() => {
    if (!categories.includes(category)) setCategory(CATEGORY_ALL);
  }, [categories, category]);
  const filtered = (0, import_react.useMemo)(() => {
    const needle = query.trim().toLowerCase();
    const result = tools.filter((tool) => {
      if (category !== CATEGORY_ALL && (tool.category || UNSORTED_CATEGORY) !== category) return false;
      if (filter === "running" && !isLive(tool)) return false;
      if (filter === "stopped" && isLive(tool)) return false;
      if (filter === "web" && !tool.url) return false;
      if (!needle) return true;
      return [tool.name, tool.description, tool.path, tool.url, tool.launch?.label, ...tool.tags ?? []].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
    });
    return result.sort((left, right) => {
      const favoriteDelta = Number(Boolean(right.favorite)) - Number(Boolean(left.favorite));
      if (favoriteDelta !== 0) return favoriteDelta;
      const leftRecent = Number(left.lastUsedAt) || Number(left.createdAt) || 0;
      const rightRecent = Number(right.lastUsedAt) || Number(right.createdAt) || 0;
      if (leftRecent !== rightRecent) return rightRecent - leftRecent;
      const liveDelta = Number(isLive(right)) - Number(isLive(left));
      if (liveDelta !== 0) return liveDelta;
      return left.name.localeCompare(right.name, "zh-Hans-CN");
    });
  }, [tools, query, filter, category]);
  const detail = detailId ? tools.find((tool) => tool.id === detailId) : null;
  const editing = editingId ? tools.find((tool) => tool.id === editingId) : null;
  const counts = data?.counts ?? { total: 0, running: 0 };
  const directories = data?.directories ?? [];
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-page", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-inner", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { className: "ait-head", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-eyebrow", children: "LOCAL AI TOOLBOX" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "ait-title", children: "\u672C\u5730AI\u5DE5\u5177\u7BB1" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "ait-subtitle", children: "\u96C6\u4E2D\u7BA1\u7406\u672C\u5730 agent \u5F00\u53D1\u51FA\u6765\u7684\u5DE5\u5177\uFF1A\u542F\u52A8\u3001\u505C\u6B62\u3001\u6253\u5F00\u7F51\u9875\u754C\u9762\u6216\u5E94\u7528\uFF0C\u5E76\u67E5\u770B\u6BCF\u4E2A\u9879\u76EE\u7684 README\u3002" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-head-actions", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "ait-btn", onClick: () => void load(), title: "\u91CD\u65B0\u8BFB\u53D6\u72B6\u6001", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "refresh", size: 15 }),
            " \u5237\u65B0"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "ait-btn", onClick: handleRescan, disabled: busy?.id === "rescan", children: [
            busy?.id === "rescan" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-spinner" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "folder", size: 15 }),
            " \u91CD\u65B0\u626B\u63CF"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "ait-btn", onClick: () => setAddMode("executable"), children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "plus", size: 15 }),
            " \u6DFB\u52A0\u5DE5\u5177"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "ait-btn ait-btn-primary", onClick: () => setAddMode("directory"), children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "plus", size: 15 }),
            " \u6DFB\u52A0\u76EE\u5F55"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-stats", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-stat", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: counts.total ?? tools.length }),
          " \u4E2A\u5DE5\u5177"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-stat", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: counts.running ?? 0 }),
          " \u6B63\u5728\u8FD0\u884C"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-stat", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: directories.length }),
          " \u4E2A\u9879\u76EE\u76EE\u5F55"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-stat", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: tools.filter((tool) => tool.kind === "url" || tool.kind === "app").length }),
          " \u4E2A\u7F51\u5740 / \u5E94\u7528"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-sort-note", children: "\u2B50 \u6536\u85CF\u7F6E\u9876 \xB7 \u6700\u8FD1\u4F7F\u7528\u4F18\u5148 \xB7 \u5176\u4F59\u6309\u540D\u79F0\u6392\u5E8F" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-categories", role: "tablist", "aria-label": "\u5DE5\u5177\u5206\u7C7B", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-cat-label", children: "\u5206\u7C7B" }),
        categories.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            type: "button",
            className: "ait-cat",
            "data-active": category === item,
            onClick: () => setCategory(item),
            role: "tab",
            "aria-selected": category === item,
            children: [
              item,
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-cat-count", children: categoryCounts.get(item) || 0 })
            ]
          },
          item
        ))
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-toolbar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "ait-search", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "search", size: 15 }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: query, onChange: (event) => setQuery(event.target.value), placeholder: "\u641C\u7D22\u540D\u79F0\u3001\u8BF4\u660E\u3001\u8DEF\u5F84\u6216\u7AEF\u53E3\u2026", "aria-label": "\u641C\u7D22\u5DE5\u5177" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-filters", role: "tablist", "aria-label": "\u7B5B\u9009", children: [["all", "\u5168\u90E8"], ["running", "\u8FD0\u884C\u4E2D"], ["stopped", "\u672A\u8FD0\u884C"], ["web", "\u6709\u7F51\u9875"]].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "ait-filter", "data-active": filter === id, onClick: () => setFilter(id), role: "tab", children: label }, id)) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-dirs", children: [
        directories.map((directory) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "ait-dir", title: directory.path, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "folder", size: 12 }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-dir-label", children: directory.label }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => void handleRemoveDirectory(directory), "aria-label": `\u79FB\u9664 ${directory.label}`, title: "\u79FB\u9664\u76EE\u5F55", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "close", size: 12 }) })
        ] }, directory.id)),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "ait-dir ait-dir-add", onClick: () => setAddMode("directory"), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "plus", size: 12 }),
          " \u76EE\u5F55"
        ] })
      ] }),
      loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-grid", children: [0, 1, 2, 3].map((index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-card", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-skeleton", style: { width: 40, height: 40, borderRadius: 12 } }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-skeleton", style: { width: "62%", height: 16 } }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-skeleton", style: { width: "92%", height: 12 } }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-skeleton", style: { width: "78%", height: 12 } })
      ] }, index)) }) : loadError ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ait-empty", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-empty-icon", children: "\u26A0\uFE0F" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u65E0\u6CD5\u8BFB\u53D6\u5DE5\u5177\u5217\u8868" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: loadError }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "ait-btn", onClick: () => void load(), children: "\u91CD\u8BD5" })
      ] }) : filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        EmptyState,
        {
          hasDirectories: directories.length > 0,
          hasFilters: Boolean(query.trim()) || filter !== "all" || category !== CATEGORY_ALL,
          onAdd: () => setAddMode("directory"),
          onClear: () => {
            setQuery("");
            setFilter("all");
            setCategory(CATEGORY_ALL);
          }
        }
      ) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ait-grid", children: filtered.map((tool) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        ToolCard,
        {
          tool,
          busy,
          onStart: handleStart,
          onStop: handleStop,
          onOpen: handleOpen,
          onDetail: (selected) => setDetailId(selected.id),
          onFavorite: handleFavorite
        },
        tool.id
      )) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 28, color: "var(--ait-text-3)", fontSize: 11 }, children: [
        "\u5DE5\u5177\u6570\u636E\u4FDD\u5B58\u5728 ",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ait-mono", children: data?.dataDir || "~/.dsh/ai-toolbox" }),
        "\uFF0C\u53EA\u8BB0\u5F55\u8DEF\u5F84\u548C\u542F\u52A8\u65B9\u5F0F\uFF0C\u4E0D\u4F1A\u590D\u5236\u9879\u76EE\u6587\u4EF6\u3002"
      ] })
    ] }),
    detail ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      DetailDrawer,
      {
        tool: detail,
        busy,
        onClose: () => setDetailId(null),
        onStart: handleStart,
        onStop: handleStop,
        onOpen: handleOpen,
        onReveal: handleReveal,
        onRemove: handleRemove,
        onEdit: (tool) => setEditingId(tool.id),
        onFavorite: handleFavorite,
        showToast
      }
    ) : null,
    addMode ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      AddDialog,
      {
        initialMode: addMode,
        onClose: () => setAddMode(null),
        onDone: (state) => {
          if (state) setData(state);
          setAddMode(null);
        },
        showToast
      }
    ) : null,
    editing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      EditDialog,
      {
        tool: editing,
        onClose: () => setEditingId(null),
        onSaved: (payload) => {
          if (payload.state) setData(payload.state);
        },
        showToast
      }
    ) : null,
    preview ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PreviewModal, { preview, onClose: () => setPreview(null) }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toast, { toast })
  ] });
}
var inject = ["slots"];
var name = "ai-toolbox";
function apply(ctx) {
  ctx.slots.inject("main", () => ctx.slots.register({
    name: "main",
    key: "ai-toolbox"
  }, App));
  ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
    name: "sidebar.panellist",
    id: "ai-toolbox",
    order: 20,
    label: "\u672C\u5730AI\u5DE5\u5177\u7BB1"
  }, SidebarIcon));
}
    return module.exports;
  }
});
