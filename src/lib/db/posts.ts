import "server-only";
import { unstable_cache } from "next/cache";
import { getCacheScope, isDemoMode } from "@/lib/data-driver";
import { CACHE_TAGS, postTag } from "./cache-tags";
import type { PostsDriver } from "./driver-types";
import type { PostDetail, PostFilters, PostListItem, PostPage, SitemapPost } from "./post-query";

// Types and constants live in `post-query.ts`; this facade keeps one import path for the pages.
export * from "./post-query";

const loadDriver = async (): Promise<PostsDriver> =>
  isDemoMode()
    ? (await import("@/lib/demo/db/posts")).demoPostsDriver
    : (await import("@/lib/db/supabase/posts")).supabasePostsDriver;

/** Published posts, newest first, optionally one category, 6 per page (`BLOG_PAGE_SIZE`). Cached under `posts`. */
export const getPublishedPosts = (filters: PostFilters): Promise<PostPage> =>
  unstable_cache(
    async (f: PostFilters) => (await loadDriver()).fetchPublishedPosts(f),
    ["published-posts", getCacheScope(), JSON.stringify(filters)],
    { tags: [CACHE_TAGS.posts] },
  )(filters);

/**
 * A published post by slug (a draft is null), with its author and up to 3 related published properties.
 * Cached under `posts`, `post:<slug>` and `properties` (the related cards change with the catalog).
 */
export const getPostBySlug = (slug: string): Promise<PostDetail | null> =>
  unstable_cache(
    async (s: string) => (await loadDriver()).fetchPostBySlug(s),
    ["post-by-slug", getCacheScope(), slug],
    { tags: [CACHE_TAGS.posts, CACHE_TAGS.properties, postTag(slug)] },
  )(slug);

/** The `count` newest published posts (home block). Cached under `posts`. */
export const getLatestPosts = (count: number): Promise<PostListItem[]> =>
  unstable_cache(
    async (n: number) => (await loadDriver()).fetchLatestPosts(n),
    ["latest-posts", getCacheScope(), String(count)],
    { tags: [CACHE_TAGS.posts] },
  )(count);

/** Slug + `updated_at` of every published, indexable post, for the sitemap. Cached under `posts`. */
export const getSitemapPosts = (): Promise<SitemapPost[]> =>
  unstable_cache(
    async () => (await loadDriver()).fetchSitemapPosts(),
    ["sitemap-posts", getCacheScope()],
    { tags: [CACHE_TAGS.posts] },
  )();
