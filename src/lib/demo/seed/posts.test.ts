import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BLOG_CATEGORIES, BLOG_RELATED_MAX } from "@/constants/blog";
import { buildDemoSeed } from "./index";
import { SEED_POSTS } from "./posts";

const seed = buildDemoSeed(Date.now());
const wordCount = (text: string): number => text.split(/\s+/).filter(Boolean).length;

describe("demo seed posts", () => {
  it("has 8 published posts and 1 draft across all categories", () => {
    expect(seed.posts.filter((post) => post.status === "published")).toHaveLength(8);
    expect(seed.posts.filter((post) => post.status === "draft")).toHaveLength(1);
    const published = seed.posts.filter((post) => post.status === "published");
    for (const { key } of BLOG_CATEGORIES) expect(published.some((post) => post.category === key)).toBe(true);
    expect(seed.posts.every((post) => (post.status === "published") === (post.published_at !== null))).toBe(true);
  });

  it("has real Markdown bodies, short excerpts and 1-3 tags", () => {
    for (const post of seed.posts.filter((p) => p.status === "published")) {
      expect(wordCount(post.body), post.slug).toBeGreaterThanOrEqual(300);
      expect(wordCount(post.body), post.slug).toBeLessThanOrEqual(600);
      expect(post.body).toContain("## ");
      expect(post.body).toContain("](/catalog)");
      expect(post.excerpt.length).toBeLessThanOrEqual(300);
      expect(post.tags.length).toBeGreaterThanOrEqual(1);
      expect(post.tags.length).toBeLessThanOrEqual(3);
    }
  });

  it("links at most 3 published properties and uses existing cover files", () => {
    const publishedIds = new Set(seed.properties.filter((p) => p.status === "published").map((p) => p.id));
    for (const post of seed.posts) {
      const links = seed.post_properties.filter((link) => link.post_id === post.id);
      expect(links.length).toBeLessThanOrEqual(BLOG_RELATED_MAX);
      expect(links.map((link) => link.position)).toEqual(links.map((_, index) => index));
      for (const link of links) expect(publishedIds.has(link.property_id)).toBe(true);
      if (post.cover_key) {
        expect(existsSync(path.join(process.cwd(), "public", post.cover_key))).toBe(true);
        expect(post.cover_alt).toBeTruthy();
      }
    }
    expect(seed.posts.some((post) => post.cover_key === null && post.status === "published")).toBe(true);
    expect(seed.posts.some((post) => post.author_agent_id === null)).toBe(true);
    expect(seed.posts.some((post) => post.author_agent_id !== null)).toBe(true);
    expect(new Set(SEED_POSTS.map((post) => post.slug)).size).toBe(SEED_POSTS.length);
  });
});
