import { describe, expect, it } from "vitest";

import { demoPostsDriver } from "@/lib/demo/db/posts";
import { blogPaths, buildSitemapEntries, catalogPaths } from "./sitemap-entries";

describe("catalogPaths", () => {
  it("lists the plain catalog and each deal section, nothing filtered", () => {
    expect(catalogPaths()).toEqual([
      "/catalog",
      "/catalog?deal=sell",
      "/catalog?deal=rent_long",
      "/catalog?deal=rent_day",
    ]);
  });
});

describe("buildSitemapEntries", () => {
  const entries = buildSitemapEntries({
    siteUrl: "https://example.test",
    properties: [{ slug: "flat-1", updated_at: "2026-10-01T10:00:00.000Z" }],
    indexablePages: ["home", "about"],
  });

  it("uses absolute URLs and the real updated_at", () => {
    expect(entries.map((e) => e.url)).toEqual([
      "https://example.test/",
      "https://example.test/about",
      "https://example.test/catalog",
      "https://example.test/catalog?deal=sell",
      "https://example.test/catalog?deal=rent_long",
      "https://example.test/catalog?deal=rent_day",
      "https://example.test/catalog/flat-1",
      ...blogPaths().map((path) => `https://example.test${path}`),
    ]);
    expect(entries.find((e) => e.url.endsWith("/catalog/flat-1"))?.lastModified).toEqual(
      new Date("2026-10-01T10:00:00.000Z"),
    );
  });

  it("leaves out noindex pages and never lists admin or api", () => {
    expect(entries.some((e) => e.url.includes("/contacts") || e.url.includes("/admin") || e.url.includes("/api"))).toBe(false);
  });
});

describe("blog in the sitemap", () => {
  it("lists /blog and each category", () => {
    expect(blogPaths()).toEqual([
      "/blog",
      "/blog?category=buyers",
      "/blog?category=sellers",
      "/blog?category=rent",
      "/blog?category=market",
      "/blog?category=tips",
    ]);
  });

  it("adds posts with lastModified", () => {
    const entries = buildSitemapEntries({
      siteUrl: "https://example.test",
      properties: [],
      posts: [{ slug: "a-post", updated_at: "2026-10-05T08:00:00.000Z" }],
      indexablePages: [],
    });
    const post = entries.find((e) => e.url === "https://example.test/blog/a-post");
    expect(post?.lastModified).toEqual(new Date("2026-10-05T08:00:00.000Z"));
    expect(entries.some((e) => e.url === "https://example.test/blog?category=tips")).toBe(true);
  });

  it("demo data: published posts only, the draft is absent", async () => {
    const posts = await demoPostsDriver.fetchSitemapPosts();
    expect(posts.length).toBe(8);
    expect(posts.some((p) => p.slug.endsWith("chernetka"))).toBe(false);
  });
});
