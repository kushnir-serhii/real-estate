import { escapeHtml, renderInline, renderToken } from "./markdown";
import type { DiagramsDoc, Section } from "./parse";

export type RenderedDiagram = { light: string; dark: string };

const STYLE = String.raw`
:root {
  color-scheme: light dark;
  --bg: #f8fafc; --panel: #ffffff; --text: #0f172a; --muted: #475569; --line: #cbd5e1;
  --link: #1d4ed8; --focus: #1d4ed8; --code-bg: #eef2f7;
  --tip-bg: #0f172a; --tip-text: #f8fafc;
  --real-bg: #dbeafe; --real-fg: #1e3a8a; --mock-bg: #fef3c7; --mock-fg: #78350f;
  --seam-bg: #ede9fe; --seam-fg: #4c1d95; --none-bg: #e5e7eb; --none-fg: #1f2937;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0b1120; --panel: #111a2e; --text: #e5e7eb; --muted: #aab4c3; --line: #2b3a55;
    --link: #93c5fd; --focus: #93c5fd; --code-bg: #1a2540;
    --tip-bg: #f1f5f9; --tip-text: #0f172a;
    --real-bg: #1e3a8a; --real-fg: #dbeafe; --mock-bg: #78350f; --mock-fg: #fef3c7;
    --seam-bg: #4c1d95; --seam-fg: #ede9fe; --none-bg: #374151; --none-fg: #f3f4f6;
  }
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0; background: var(--bg); color: var(--text); line-height: 1.55;
  font: 16px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}
main { max-width: 1100px; margin: 0 auto; padding: 24px 16px 64px; }
h1 { font-size: 1.9rem; line-height: 1.2; margin: 0 0 12px; }
h2 { font-size: 1.35rem; margin: 40px 0 8px; scroll-margin-top: 16px; }
h3 { font-size: 1.1rem; margin: 24px 0 6px; }
p { margin: 0 0 12px; max-width: 75ch; }
a { color: var(--link); }
code { font: 0.9em ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background: var(--code-bg); padding: 1px 5px; border-radius: 4px; overflow-wrap: anywhere; }
pre { overflow-x: auto; background: var(--code-bg); padding: 12px; border-radius: 8px; }
pre code { background: none; padding: 0; }
ul, ol { margin: 0 0 12px; padding-left: 22px; }
.tag { display: inline-block; font: 600 0.78em ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; padding: 1px 7px; border-radius: 999px; border: 1px solid currentColor; line-height: 1.5; white-space: nowrap; }
.tag-real { background: var(--real-bg); color: var(--real-fg); }
.tag-mock { background: var(--mock-bg); color: var(--mock-fg); border-style: dashed; }
.tag-seam { background: var(--seam-bg); color: var(--seam-fg); }
.tag-none { background: var(--none-bg); color: var(--none-fg); }
nav.toc { margin: 28px 0 0; padding: 12px 16px; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; }
nav.toc h2 { margin: 0 0 6px; font-size: 1rem; }
nav.toc ol { margin: 0; }
.table-wrap { overflow-x: auto; margin: 0 0 16px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }
table { border-collapse: collapse; width: 100%; font-size: 0.92rem; }
table.blocks { min-width: 760px; }
th, td { text-align: left; vertical-align: top; padding: 8px 10px; border-bottom: 1px solid var(--line); }
thead th { background: var(--code-bg); white-space: nowrap; }
tbody tr:last-child > * { border-bottom: 0; }
tbody th { font-weight: 600; white-space: nowrap; }
.frame { overflow-x: auto; margin: 12px 0 16px; padding: 12px; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; }
.table-wrap:focus-visible, .frame:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
.diagram-svg { display: block; max-width: none; height: auto; }
.svg-dark { display: none; }
@media (prefers-color-scheme: dark) { .svg-light { display: none; } .svg-dark { display: block; } }
[data-block] { cursor: help; outline: none; }
[data-block]:hover, [data-block]:focus { filter: drop-shadow(0 0 3px var(--focus)); }
[data-block]:focus-visible { filter: drop-shadow(0 0 0 var(--focus)) drop-shadow(0 0 2px var(--focus)) drop-shadow(0 0 4px var(--focus)); }
#tip {
  position: fixed; z-index: 10; left: 0; top: 0; max-width: min(320px, calc(100vw - 16px));
  background: var(--tip-bg); color: var(--tip-text); padding: 8px 10px; border-radius: 6px;
  font-size: 0.85rem; line-height: 1.4; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3); pointer-events: none;
}
#tip[hidden] { display: none; }
#tip .tag { margin-right: 6px; }
#tip .tag-real { background: var(--real-bg); color: var(--real-fg); }
.hint { color: var(--muted); font-size: 0.9rem; }
`;

const SCRIPT = String.raw`
(function () {
  var tip = document.getElementById("tip");
  var current = null;
  // The aria-label carries the same text; drop the SVG titles so the browser does not add a second tooltip.
  Array.prototype.forEach.call(document.querySelectorAll("[data-block] > title"), function (t) { t.remove(); });

  function place(el) {
    var r = el.getBoundingClientRect();
    var vw = document.documentElement.clientWidth;
    var vh = document.documentElement.clientHeight;
    var w = tip.offsetWidth;
    var h = tip.offsetHeight;
    var x = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, vw - w - 8));
    var y = r.top - h - 8;
    if (y < 8) y = Math.min(r.bottom + 8, vh - h - 8);
    tip.style.left = x + "px";
    tip.style.top = Math.max(8, y) + "px";
  }
  function show(el) {
    current = el;
    var marker = el.getAttribute("data-marker");
    tip.textContent = "";
    if (marker) {
      var tag = document.createElement("span");
      tag.className = "tag tag-" + marker;
      tag.textContent = marker;
      tip.appendChild(tag);
    }
    tip.appendChild(document.createTextNode(el.getAttribute("data-desc") || ""));
    tip.hidden = false;
    place(el);
  }
  function hide() { current = null; tip.hidden = true; }
  function target(node) { return node && node.closest ? node.closest("[data-block]") : null; }

  document.addEventListener("mouseover", function (e) {
    var t = target(e.target);
    if (t && t !== current) show(t);
    else if (!t && current) hide();
  });
  document.addEventListener("focusin", function (e) {
    var t = target(e.target);
    if (t) show(t);
  });
  document.addEventListener("focusout", function (e) { if (target(e.target)) hide(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") hide(); });
  window.addEventListener("scroll", function () { if (current) place(current); }, true);
  window.addEventListener("resize", hide);
})();
`;

const renderDiagramSection = (section: Section, rendered: RenderedDiagram): string => {
  const parts = section.tokens.map((token) =>
    token.kind === "code" && token.lang === "mermaid"
      ? `<div class="frame" tabindex="0" role="region" aria-label="Diagram: ${escapeHtml(section.title)}"><div class="svg-light">${rendered.light}</div><div class="svg-dark">${rendered.dark}</div></div>`
      : renderToken(token),
  );
  return `<section id="${section.id}"><h2>${renderInline(section.title)}</h2>${parts.join("")}</section>`;
};

const renderPlainSection = (section: Section): string =>
  `<section id="${section.id}"><h2>${renderInline(section.title)}</h2>${section.tokens.map(renderToken).join("")}</section>`;

export const buildViewerHtml = (doc: DiagramsDoc, sourceHash: string, diagrams: Map<string, RenderedDiagram>): string => {
  const render = (section: Section): string => {
    const rendered = diagrams.get(section.id);
    return rendered ? renderDiagramSection(section, rendered) : renderPlainSection(section);
  };
  const legend = doc.sections.find((section) => section.id === "legend");
  const rest = doc.sections.filter((section) => section !== legend);
  const toc = doc.sections
    .map((section) => `<li><a href="#${section.id}">${renderInline(section.title)}</a></li>`)
    .join("");
  const body = [
    `<h1>${renderInline(doc.title)}</h1>`,
    doc.intro.map(renderToken).join(""),
    `<p class="hint">Hover a block, or Tab to it, to read what it is. Esc closes the tooltip.</p>`,
    legend ? render(legend) : "",
    `<nav class="toc" aria-label="Contents"><h2>Contents</h2><ol>${toc}</ol></nav>`,
    rest.map(render).join(""),
  ].join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="diagrams-source-sha256" content="${sourceHash}">
<title>${escapeHtml(doc.title)}</title>
<style>${STYLE}</style>
</head>
<body>
<main>
${body}
</main>
<div id="tip" role="tooltip" hidden></div>
<script>${SCRIPT}</script>
</body>
</html>
`;
};
