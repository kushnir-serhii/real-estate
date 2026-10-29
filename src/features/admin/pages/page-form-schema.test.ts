import { describe, expect, it } from "vitest";
import { DEFAULT_PAGES } from "@/constants/pages";
import {
  PAGE_LIMITS,
  pageSlugSchema,
  pageToFormRaw,
  parsePageForm,
  readPageFormRaw,
  samePageFormValues,
} from "./page-form-schema";
import type { PageFormRaw } from "./page-form-schema";

const raw: PageFormRaw = {
  title: "  Про агентство ",
  body: "## Про нас\n\n- пункт\n\n",
  seo_title: "",
  seo_description: "  ",
  noindex: false,
  is_draft: true,
};

describe("parsePageForm", () => {
  it("trims, turns empty SEO fields into null", () => {
    const r = parsePageForm("about", raw);
    expect(r).toEqual({
      ok: true,
      values: {
        title: "Про агентство",
        body: "## Про нас\n\n- пункт",
        seo_title: null,
        seo_description: null,
        noindex: false,
        is_draft: false,
      },
    });
  });

  it("keeps the draft flag only for the privacy page", () => {
    const r = parsePageForm("privacy", raw);
    expect(r.ok && r.values.is_draft).toBe(true);
  });

  it("requires a title", () => {
    const r = parsePageForm("home", { ...raw, title: "   " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.title).toBeDefined();
  });

  it("enforces the hard limits with one message per field", () => {
    const r = parsePageForm("contacts", {
      ...raw,
      title: "a".repeat(PAGE_LIMITS.title + 1),
      body: "b".repeat(PAGE_LIMITS.body + 1),
      seo_title: "c".repeat(PAGE_LIMITS.seoTitle + 1),
      seo_description: "d".repeat(PAGE_LIMITS.seoDescription + 1),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["body", "seo_description", "seo_title", "title"]);
  });

  it("accepts SEO texts over the recommended length but within the hard limit", () => {
    const r = parsePageForm("home", { ...raw, seo_title: "x".repeat(80), seo_description: "y".repeat(200) });
    expect(r.ok).toBe(true);
  });
});

describe("readPageFormRaw", () => {
  it("reads checkboxes and missing fields", () => {
    const fd = new FormData();
    fd.set("title", "Контакти");
    fd.set("noindex", "on");
    expect(readPageFormRaw(fd)).toEqual({
      title: "Контакти",
      body: "",
      seo_title: "",
      seo_description: "",
      noindex: true,
      is_draft: false,
    });
  });
});

describe("helpers", () => {
  it("round-trips the defaults and compares values", () => {
    const form = pageToFormRaw(DEFAULT_PAGES.privacy);
    expect(form.is_draft).toBe(true);
    expect(samePageFormValues(form, { ...form })).toBe(true);
    expect(samePageFormValues(form, { ...form, noindex: true })).toBe(false);
  });

  it("knows only the fixed slugs", () => {
    expect(pageSlugSchema.safeParse("privacy").success).toBe(true);
    expect(pageSlugSchema.safeParse("blog").success).toBe(false);
  });
});
