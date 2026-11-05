import { describe, expect, it } from "vitest";

import { blogListCanonical, blogListTitle, blogPostSeoDescription, trimOnWord } from "./blog-seo";

describe("blog list SEO", () => {
  it("drops page=1 from the canonical and keeps category and page >= 2", () => {
    expect(blogListCanonical({ page: 1 })).toBe("/blog");
    expect(blogListCanonical({ category: "rent", page: 1 })).toBe("/blog?category=rent");
    expect(blogListCanonical({ category: "rent", page: 2 })).toBe("/blog?category=rent&page=2");
    expect(blogListCanonical({ page: 3 })).toBe("/blog?page=3");
  });

  it("titles the list, a category and later pages", () => {
    expect(blogListTitle({ page: 1 })).toBe("Блог");
    expect(blogListTitle({ category: "buyers", page: 1 })).toBe("Покупцям — Блог");
    expect(blogListTitle({ page: 2 })).toBe("Блог — сторінка 2");
  });
});

describe("blog post description", () => {
  it("trims on a word to 155 characters and prefers the SEO text", () => {
    const long = "слово ".repeat(60);
    const d = blogPostSeoDescription({ title: "t", excerpt: long, seo_title: null, seo_description: null });
    expect(d.length).toBeLessThanOrEqual(155);
    expect(d.endsWith("…")).toBe(true);
    expect(blogPostSeoDescription({ title: "t", excerpt: "e", seo_title: null, seo_description: "SEO" })).toBe("SEO");
    expect(trimOnWord("коротко", 155)).toBe("коротко");
  });
});
