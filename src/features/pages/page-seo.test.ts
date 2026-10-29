import { describe, expect, it } from "vitest";
import { BRAND } from "@/constants/brand";
import { DEFAULT_PAGES } from "@/constants/pages";
import { isPageSlug, PAGE_PATHS } from "./page-paths";
import { pageSeoDescription, pageSeoTitle, pageSeoTitleText, seoLengthStatus } from "./page-seo";

const page = { title: "Про агентство", seo_title: null, seo_description: null };

describe("pageSeoTitle", () => {
  it("uses a custom SEO title as is", () => {
    expect(pageSeoTitle({ ...page, seo_title: "  Хто ми — Sofiacity " })).toEqual({ absolute: "Хто ми — Sofiacity" });
    expect(pageSeoTitleText({ ...page, seo_title: "Хто ми" })).toBe("Хто ми");
  });
  it("falls back to the page title with the brand (root template)", () => {
    expect(pageSeoTitle({ ...page, seo_title: "   " })).toBe("Про агентство");
    expect(pageSeoTitleText(page)).toBe(`Про агентство — ${BRAND.name}`);
  });
  it("never doubles the brand for the built-in pages", () => {
    for (const content of Object.values(DEFAULT_PAGES)) {
      const text = pageSeoTitleText(content);
      expect(text.split(BRAND.name).length - 1).toBeLessThanOrEqual(1);
    }
  });
});

describe("pageSeoDescription", () => {
  it("prefers the custom description, else the site description", () => {
    expect(pageSeoDescription({ ...page, seo_description: " Опис " })).toBe("Опис");
    expect(pageSeoDescription({ ...page, seo_description: "" })).toBe(BRAND.siteDescription);
  });
});

describe("seoLengthStatus", () => {
  const range = { min: 50, max: 60 };
  it("classifies lengths", () => {
    expect(seoLengthStatus(0, range)).toBe("empty");
    expect(seoLengthStatus(49, range)).toBe("short");
    expect(seoLengthStatus(50, range)).toBe("ok");
    expect(seoLengthStatus(60, range)).toBe("ok");
    expect(seoLengthStatus(61, range)).toBe("long");
  });
});

describe("page paths", () => {
  it("knows only the fixed slugs", () => {
    expect(isPageSlug("about")).toBe(true);
    expect(isPageSlug("blog")).toBe(false);
    expect(PAGE_PATHS.home).toBe("/");
  });
});
