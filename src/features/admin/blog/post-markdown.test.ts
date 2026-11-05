import { Editor } from "@tiptap/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Markdown } from "@/features/pages/markdown";
import { createPostExtensions } from "./post-editor-extensions";

const SAMPLE = [
  "## Як купити квартиру",
  "",
  "Перший абзац з **жирним**, *курсивом* і [посиланням](https://example.com/page).",
  "",
  "### Документи",
  "",
  "- паспорт",
  "- ідентифікаційний код",
  "- **довідка** про доходи",
  "",
  "1. Оберіть об'єкт",
  "2. Перевірте документи",
  "3. Підпишіть договір",
  "",
  "> Не поспішайте з авансом.",
  "",
  "Контакти: [наша сторінка](/contacts), [пошта](mailto:info@example.com).",
].join("\n");

/** What the editor saves for a Markdown document: parse into TipTap, serialize back. */
const roundTrip = (markdown: string): string => {
  const editor = new Editor({
    element: null,
    extensions: createPostExtensions(),
    content: markdown,
    contentType: "markdown",
  });
  try {
    return editor.getMarkdown();
  } finally {
    editor.destroy();
  }
};

const render = (markdown: string): string => renderToStaticMarkup(createElement(Markdown, null, markdown));

describe("blog editor Markdown round-trip", () => {
  it("keeps the sample unchanged", () => {
    expect(roundTrip(SAMPLE)).toBe(SAMPLE);
  });

  it("is stable: a second pass changes nothing", () => {
    const once = roundTrip(SAMPLE);
    expect(roundTrip(once)).toBe(once);
  });

  it("renders on the site exactly like the original", () => {
    expect(render(roundTrip(SAMPLE))).toBe(render(SAMPLE));
  });

  it("renders every allowed element on the site", () => {
    const html = render(roundTrip(SAMPLE));
    for (const tag of ["<h2", "<h3", "<strong", "<em", "<ul", "<ol", "<blockquote", "<a "]) {
      expect(html).toContain(tag);
    }
    expect(html).toContain('href="https://example.com/page"');
    expect(html).toContain('href="/contacts"');
  });

  it("drops what the editor does not support instead of saving it", () => {
    const out = roundTrip("# Заголовок 1\n\n~~закреслено~~ і `код`");
    expect(out).not.toContain("~~");
    expect(out).not.toContain("`");
    expect(out).not.toMatch(/^# /);
  });
});
