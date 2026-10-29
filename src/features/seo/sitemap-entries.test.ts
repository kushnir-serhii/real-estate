import { describe, expect, it } from "vitest";

import { buildSitemapEntries, catalogPaths } from "./sitemap-entries";

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
    ]);
    expect(entries.at(-1)?.lastModified).toEqual(new Date("2026-10-01T10:00:00.000Z"));
  });

  it("leaves out noindex pages and never lists admin or api", () => {
    expect(entries.some((e) => e.url.includes("/contacts") || e.url.includes("/admin") || e.url.includes("/api"))).toBe(false);
  });
});
