import type { BlogCategory } from "@/constants/blog";
import type { Database } from "@/lib/supabase/database.types";
import type { PropertyAgent, PublishedProperty } from "./property-query";

/** Public blog types shared by the facade and both data drivers. */

type PostRow = Database["public"]["Tables"]["posts"]["Row"];

export const POST_STATUSES = ["draft", "published"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

/** The row with the text columns narrowed to their check-constraint values. */
export type Post = Omit<PostRow, "category" | "status"> & { category: BlogCategory; status: PostStatus };

/** A list card: no body, no author id, no status (the public only sees published). */
export type PostListItem = Pick<
  Post,
  "id" | "slug" | "title" | "excerpt" | "category" | "tags" | "cover_key" | "cover_alt" | "published_at" | "updated_at"
>;

export type PostPage = {
  posts: PostListItem[];
  total: number;
  page: number;
  pageCount: number;
};

export type PostFilters = { category?: BlogCategory; page: number };

/** A published post with its author (active agents only) and up to 3 related published properties in position order. */
export type PostDetail = Omit<Post, "author_agent_id" | "status"> & {
  author: PropertyAgent | null;
  related: PublishedProperty[];
};

export type SitemapPost = Pick<Post, "slug" | "updated_at">;

/** Page size of the admin list. */
export const ADMIN_POSTS_PAGE_SIZE = 20;

export type AdminPostFilters = { status?: PostStatus; category?: BlogCategory; q?: string; page: number };

export type AdminPostListItem = Pick<
  Post,
  "id" | "slug" | "title" | "category" | "status" | "cover_key" | "cover_alt" | "published_at" | "updated_at"
>;

export type AdminPostPage = { items: AdminPostListItem[]; total: number; page: number; pageCount: number };

/** One post of any status with the ids of its related properties in position order. */
export type AdminPost = Post & { property_ids: string[] };
