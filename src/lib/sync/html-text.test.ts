import { describe, expect, it } from "vitest";

import { decodeHtmlEntities, htmlToPlainText } from "./html-text";

describe("decodeHtmlEntities", () => {
  it("named and numeric entities", () => {
    expect(decodeHtmlEntities("&asymp; 5 &laquo;a&raquo; &quot;b&quot; &amp; &mdash; &#8364; &#x20AC;")).toBe(
      '≈ 5 «a» "b" & — € €',
    );
    expect(decodeHtmlEntities("a&nbsp;b")).toBe("a b");
  });

  it("single pass and unknown entities untouched", () => {
    expect(decodeHtmlEntities("&amp;lt;")).toBe("&lt;");
    expect(decodeHtmlEntities("&unknown; &#99999999;")).toBe("&unknown; ");
  });
});

describe("htmlToPlainText", () => {
  it("keeps paragraph and line breaks, strips tags, decodes entities", () => {
    expect(htmlToPlainText("<p>Перший &amp; другий</p><p>Абзац<br>новий рядок</p>")).toBe(
      "Перший & другий\n\nАбзац\nновий рядок",
    );
  });

  it("does not turn encoded tags into markup and trims", () => {
    expect(htmlToPlainText("  &lt;b&gt;x&lt;/b&gt;  \n\n\n\n y ")).toBe("<b>x</b>\n\ny");
  });

  it("empty / tags only -> null", () => {
    expect(htmlToPlainText("")).toBeNull();
    expect(htmlToPlainText("<p> </p><br>")).toBeNull();
    expect(htmlToPlainText(null)).toBeNull();
  });
});
