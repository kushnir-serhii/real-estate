import "server-only";
import type { BlogCategory } from "@/constants/blog";
import type { AdminPostsDriver } from "@/lib/db/driver-types";
import { ADMIN_POSTS_PAGE_SIZE } from "@/lib/db/post-query";
import type { AdminPost, AdminPostListItem } from "@/lib/db/post-query";
import type { Database } from "@/lib/supabase/database.types";
import { getDemoStore } from "../store";

type PostRow = Database["public"]["Tables"]["posts"]["Row"];

/** The check constraints guarantee these values (the generated types say string). */
const toAdminPost = (row: PostRow, propertyIds: string[]): AdminPost => ({
  ...row,
  category: row.category as BlogCategory,
  status: row.status === "published" ? "published" : "draft",
  tags: [...row.tags],
  property_ids: propertyIds,
});

const propertyIdsOf = (postId: string): string[] =>
  getDemoStore()
    .post_properties.filter((link) => link.post_id === postId)
    .sort((a, b) => a.position - b.position)
    .map((link) => link.property_id);

/** `slug text not null unique`. */
const slugTaken = (slug: string, exceptId: string | null): boolean =>
  getDemoStore().posts.some((row) => row.slug === slug && row.id !== exceptId);

const authorMissing = (authorId: string | null): boolean =>
  authorId !== null && !getDemoStore().agents.some((agent) => agent.id === authorId);

const fetchAdminPosts: AdminPostsDriver["fetchAdminPosts"] = async ({ status, category, q, page }) => {
  const needle = q?.trim().toLowerCase();
  const matches = getDemoStore()
    .posts.filter(
      (row) =>
        (status === undefined || row.status === status) &&
        (category === undefined || row.category === category) &&
        (!needle || row.title.toLowerCase().includes(needle) || row.slug.includes(needle)),
    )
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at) || (a.id < b.id ? -1 : 1));
  const total = matches.length;
  const from = (page - 1) * ADMIN_POSTS_PAGE_SIZE;
  return {
    items: matches.slice(from, from + ADMIN_POSTS_PAGE_SIZE).map((row): AdminPostListItem => {
      const post = toAdminPost(row, []);
      return {
        id: post.id,
        slug: post.slug,
        title: post.title,
        category: post.category,
        status: post.status,
        cover_key: post.cover_key,
        cover_alt: post.cover_alt,
        published_at: post.published_at,
        updated_at: post.updated_at,
      };
    }),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_POSTS_PAGE_SIZE)),
  };
};

const fetchAdminPost: AdminPostsDriver["fetchAdminPost"] = async (id) => {
  const row = getDemoStore().posts.find((post) => post.id === id);
  return row ? toAdminPost(row, propertyIdsOf(id)) : null;
};

const insertPost: AdminPostsDriver["insertPost"] = async (columns) => {
  if (slugTaken(columns.slug, null)) return { ok: false, reason: "slug_taken" };
  if (authorMissing(columns.author_agent_id)) return { ok: false, reason: "author_not_found" };
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  getDemoStore().posts.push({
    ...columns,
    tags: [...columns.tags],
    id,
    cover_key: null,
    cover_alt: null,
    created_at: now,
    updated_at: now,
  });
  return { ok: true, id };
};

/** `updated_at` is bumped on update (the `set_updated_at` trigger). */
const updatePost: AdminPostsDriver["updatePost"] = async (id, columns) => {
  const row = getDemoStore().posts.find((post) => post.id === id);
  if (!row) return { ok: false, reason: "not_found" };
  if (slugTaken(columns.slug, id)) return { ok: false, reason: "slug_taken" };
  if (authorMissing(columns.author_agent_id)) return { ok: false, reason: "author_not_found" };
  Object.assign(row, columns, { tags: [...columns.tags], updated_at: new Date().toISOString() });
  return { ok: true };
};

/** `post_properties.post_id ... on delete cascade`. */
const deletePost: AdminPostsDriver["deletePost"] = async (id) => {
  const store = getDemoStore();
  const row = store.posts.find((post) => post.id === id);
  if (!row) return { ok: false, reason: "not_found" };
  store.posts = store.posts.filter((post) => post.id !== id);
  store.post_properties = store.post_properties.filter((link) => link.post_id !== id);
  return { ok: true, cover_key: row.cover_key };
};

const replacePostProperties: AdminPostsDriver["replacePostProperties"] = async (id, propertyIds) => {
  const store = getDemoStore();
  if (!store.posts.some((post) => post.id === id)) return { ok: false, reason: "not_found" };
  if (propertyIds.some((propertyId) => !store.properties.some((property) => property.id === propertyId))) {
    return { ok: false, reason: "property_not_found" };
  }
  store.post_properties = [
    ...store.post_properties.filter((link) => link.post_id !== id),
    ...propertyIds.map((property_id, position) => ({ post_id: id, property_id, position })),
  ];
  return { ok: true };
};

const setPostCover: AdminPostsDriver["setPostCover"] = async (id, cover) => {
  const row = getDemoStore().posts.find((post) => post.id === id);
  if (!row) return { ok: false, reason: "not_found" };
  const previous_key = row.cover_key;
  row.cover_key = cover?.key ?? null;
  row.cover_alt = cover ? cover.alt : null;
  row.updated_at = new Date().toISOString();
  return { ok: true, previous_key };
};

export const demoAdminPostsDriver: AdminPostsDriver = {
  fetchAdminPosts,
  fetchAdminPost,
  insertPost,
  updatePost,
  deletePost,
  replacePostProperties,
  setPostCover,
};
