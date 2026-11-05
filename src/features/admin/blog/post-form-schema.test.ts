import { describe, expect, it } from "vitest";

import { PUBLISH_ERRORS, parsePostForm, parseTags, readPostFormRaw, readPostIntent } from "./post-form-schema";
import { EMPTY_POST_FORM } from "./post-form-values";
import type { PostFormRaw } from "./post-form-values";
import { isAllowedLinkHref, normalizeLinkHref } from "./post-link";

const VALID: PostFormRaw = {
  ...EMPTY_POST_FORM,
  title: "Як купити квартиру",
  slug: "iak-kupyty-kvartyru",
  category: "buyers",
  excerpt: "Коротко про головне.",
  body: "## Розділ\n\nТекст.",
};

describe("parseTags", () => {
  it("trims, drops empty and duplicates (any case)", () => {
    expect(parseTags(" іпотека, Новобудови ,іпотека,, ІПОТЕКА\nринок ")).toEqual(["іпотека", "Новобудови", "ринок"]);
  });
});

describe("parsePostForm", () => {
  it("accepts a complete post for both intents", () => {
    expect(parsePostForm(VALID, "draft").ok).toBe(true);
    expect(parsePostForm(VALID, "publish").ok).toBe(true);
  });

  it("maps the intent to the status and the tags to an array", () => {
    const result = parsePostForm({ ...VALID, tags: "a, b" }, "publish");
    expect(result.ok && result.input.status).toBe("published");
    expect(result.ok && result.input.tags).toEqual(["a", "b"]);
  });

  it("saves a draft without an excerpt or a body", () => {
    expect(parsePostForm({ ...VALID, excerpt: "", body: "" }, "draft").ok).toBe(true);
  });

  it("refuses to publish without an excerpt or a body, with a clear message", () => {
    const result = parsePostForm({ ...VALID, excerpt: "  ", body: "\n" }, "publish");
    expect(result).toEqual({ ok: false, errors: { excerpt: PUBLISH_ERRORS.excerpt, body: PUBLISH_ERRORS.body } });
  });

  it("reports the title, slug and category per field", () => {
    const result = parsePostForm({ ...VALID, title: "", slug: "Bad Slug", category: "" }, "draft");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(["category", "slug", "title"]);
  });

  it("rejects more than 10 tags", () => {
    const tags = Array.from({ length: 11 }, (_, i) => `t${i}`).join(",");
    const result = parsePostForm({ ...VALID, tags }, "draft");
    expect(result.ok).toBe(false);
  });
});

describe("form reading", () => {
  it("reads fields and falls back to a draft intent", () => {
    const formData = new FormData();
    formData.set("title", "T");
    formData.set("noindex", "on");
    expect(readPostFormRaw(formData).title).toBe("T");
    expect(readPostFormRaw(formData).noindex).toBe(true);
    expect(readPostIntent(formData)).toBe("draft");
    formData.set("intent", "publish");
    expect(readPostIntent(formData)).toBe("publish");
    formData.set("intent", "bogus");
    expect(readPostIntent(formData)).toBe("draft");
  });
});

describe("link hrefs", () => {
  it("allows http(s), site-relative, mailto and tel", () => {
    for (const href of ["https://a.ua/x?y=1", "http://a.ua", "/contacts#form", "mailto:a@b.ua", "tel:+380441234567"]) {
      expect(isAllowedLinkHref(href)).toBe(true);
    }
  });

  it("refuses scripts, data, protocol-relative and bare words", () => {
    for (const href of ["javascript:alert(1)", "data:text/html,x", "//evil.com", "ftp://a.ua", "hello", ""]) {
      expect(isAllowedLinkHref(href)).toBe(false);
    }
  });

  it("adds https:// to a bare domain", () => {
    expect(normalizeLinkHref("site.ua/page")).toBe("https://site.ua/page");
    expect(normalizeLinkHref("javascript:alert(1)")).toBeNull();
    expect(normalizeLinkHref("  ")).toBeNull();
  });
});
