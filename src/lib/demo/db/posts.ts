import "server-only";
import { BLOG_PAGE_SIZE, BLOG_RELATED_MAX } from "@/constants/blog";
import type { BlogCategory } from "@/constants/blog";
import { demoPropertiesDriver } from "@/lib/demo/db/properties";
import type { PostsDriver } from "@/lib/db/driver-types";
import type { PostListItem, SitemapPost } from "@/lib/db/post-query";
import type { Database } from "@/lib/supabase/database.types";
import { getDemoStore } from "../store";

type PostRow = Database["public"]["Tables"]["posts"]["Row"];

/**
 * RLS mirror (migration blog): the public sees `published` posts only; the links of a post are readable only
 * while the post is published. Rows are returned as copies; related properties go through the property driver,
 * so draft / hidden properties never appear.
 */
const isPublished = (row: PostRow): boolean => row.status === "published";

const publishedAt = (row: PostRow): number => (row.published_at === null ? 0 : Date.parse(row.published_at));

/** ORDER BY published_at DESC, id. */
const newestFirst = (a: PostRow, b: PostRow): number =>
  publishedAt(b) - publishedAt(a) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** The check constraint guarantees one of BLOG_CATEGORIES (the generated type says string). */
const toCategory = (value: string): BlogCategory => value as BlogCategory;

const toListItem = (row: PostRow): PostListItem => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  excerpt: row.excerpt,
  category: toCategory(row.category),
  tags: [...row.tags],
  cover_key: row.cover_key,
  cover_alt: row.cover_alt,
  published_at: row.published_at,
  updated_at: row.updated_at,
});

const fetchPublishedPosts: PostsDriver["fetchPublishedPosts"] = async ({ category, page }) => {
  const matches = getDemoStore()
    .posts.filter((row) => isPublished(row) && (category === undefined || row.category === category))
    .sort(newestFirst);
  const total = matches.length;
  const from = (page - 1) * BLOG_PAGE_SIZE;
  return {
    // A page past the last row is not an error: empty page + the real total (as the Supabase driver does).
    posts: matches.slice(from, from + BLOG_PAGE_SIZE).map(toListItem),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / BLOG_PAGE_SIZE)),
  };
};

const fetchPostBySlug: PostsDriver["fetchPostBySlug"] = async (slug) => {
  const data = getDemoStore();
  const row = data.posts.find((post) => post.slug === slug);
  if (!row || !isPublished(row)) return null;

  // The agents policy: only active agents are readable, so an inactive author is simply absent.
  const agent = data.agents.find((a) => a.id === row.author_agent_id && a.is_active);
  const ids = data.post_properties
    .filter((link) => link.post_id === row.id)
    .sort((a, b) => a.position - b.position)
    .map((link) => link.property_id);
  const found = await demoPropertiesDriver.fetchPropertiesByIds(ids);
  const related = found
    .filter((item) => item.kind === "published")
    .map((item) => item.property)
    .slice(0, BLOG_RELATED_MAX);

  const { author_agent_id, status, ...columns } = row;
  void author_agent_id;
  void status;
  return {
    ...columns,
    category: toCategory(row.category),
    tags: [...row.tags],
    author: agent
      ? { id: agent.id, name: agent.name, phones: [...agent.phones], email: agent.email, photo_url: agent.photo_url }
      : null,
    related,
  };
};

const fetchLatestPosts: PostsDriver["fetchLatestPosts"] = async (count) =>
  getDemoStore()
    .posts.filter(isPublished)
    .sort(newestFirst)
    .slice(0, Math.max(0, count))
    .map(toListItem);

const fetchSitemapPosts: PostsDriver["fetchSitemapPosts"] = async () =>
  getDemoStore()
    .posts.filter((row) => isPublished(row) && !row.noindex)
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at) || (a.id < b.id ? -1 : 1))
    .map((row): SitemapPost => ({ slug: row.slug, updated_at: row.updated_at }));

export const demoPostsDriver: PostsDriver = {
  fetchPublishedPosts,
  fetchPostBySlug,
  fetchLatestPosts,
  fetchSitemapPosts,
};
