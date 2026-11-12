import { hasBlocksHeader, MARKERS } from "./parse";
import type { MdToken } from "./parse";

/** Tiny Markdown-to-HTML renderer for the subset `docs/diagrams.md` uses. Everything is escaped first. */

export const escapeHtml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const isMarker = (value: string): value is (typeof MARKERS)[number] => (MARKERS as readonly string[]).includes(value);

export const renderTag = (marker: string): string =>
  isMarker(marker) ? `<span class="tag tag-${marker}">${marker}</span>` : `<span class="tag tag-none">${escapeHtml(marker)}</span>`;

const SAFE_URL = /^(https?:\/\/|[\w./#-]+$)/;

/** Inline: `code` (a bare marker becomes a tag), **bold**, [text](url). */
export const renderInline = (text: string): string => {
  const codes: string[] = [];
  const withoutCode = text.replace(/`([^`]+)`/g, (_match, code: string) => {
    codes.push(isMarker(code) ? renderTag(code) : `<code>${escapeHtml(code)}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });
  const html = escapeHtml(withoutCode)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, label: string, url: string) =>
      SAFE_URL.test(url) ? `<a href="${url}" rel="noreferrer">${label}</a>` : label,
    );
  return html.replace(/\u0000(\d+)\u0000/g, (_match, index: string) => codes[Number(index)]);
};

const renderBlocksTable = (table: Extract<MdToken, { kind: "table" }>): string => {
  const head = table.header.map((cell) => `<th scope="col">${escapeHtml(cell)}</th>`).join("");
  const rows = table.rows
    .map((cells) => {
      const block = cells[0].replace(/^`+|`+$/g, "");
      const data = cells[1].replace(/^`+|`+$/g, "");
      return `<tr><th scope="row"><code>${escapeHtml(block)}</code></th><td>${renderTag(data)}</td><td>${renderInline(cells[2])}</td><td>${renderInline(cells[3])}</td></tr>`;
    })
    .join("");
  return `<div class="table-wrap" tabindex="0" role="region" aria-label="Blocks table"><table class="blocks"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
};

export const renderToken = (token: MdToken): string => {
  switch (token.kind) {
    case "heading":
      return `<h${token.level}>${renderInline(token.text)}</h${token.level}>`;
    case "paragraph":
      return `<p>${renderInline(token.text)}</p>`;
    case "list": {
      const tag = token.ordered ? "ol" : "ul";
      return `<${tag}>${token.items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</${tag}>`;
    }
    case "table": {
      if (hasBlocksHeader(token.header)) return renderBlocksTable(token);
      const head = token.header.map((cell) => `<th scope="col">${renderInline(cell)}</th>`).join("");
      const rows = token.rows
        .map((cells) => `<tr>${cells.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`)
        .join("");
      return `<div class="table-wrap" tabindex="0" role="region" aria-label="Table"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
    }
    case "code":
      return `<pre><code>${escapeHtml(token.text)}</code></pre>`;
    default: {
      const unreachable: never = token;
      return unreachable;
    }
  }
};
