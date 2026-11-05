import "server-only";
import type { BlogCategory } from "@/constants/blog";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import type { AdminPostsDriver } from "../driver-types";
import { ADMIN_POSTS_PAGE_SIZE } from "../post-query";
import type { AdminPost, AdminPostListItem } from "../post-query";

type PostRow = Database["public"]["Tables"]["posts"]["Row"];

const LIST_COLUMNS = "id,slug,title,category,status,cover_key,cover_alt,published_at,updated_at";

const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";

/** The check constraints guarantee these values (the generated types say string). */
const toAdminPost = (row: PostRow, propertyIds: string[]): AdminPost => ({
  ...row,
  category: row.category as BlogCategory,
  status: row.status === "published" ? "published" : "draft",
  property_ids: propertyIds,
});

/** Characters that would break out of a PostgREST `or(...)` filter or act as LIKE wildcards. */
const searchTerm = (q: string): string => q.replace(/[,()%_*\\]/g, " ").trim();

const fetchAdminPosts: AdminPostsDriver["fetchAdminPosts"] = async ({ status, category, q, page }) => {
  const offset = (page - 1) * ADMIN_POSTS_PAGE_SIZE;
  let query = createAdminClient().from("posts").select(LIST_COLUMNS, { count: "exact" });
  if (status) query = query.eq("status", status);
  if (category) query = query.eq("category", category);
  const term = q ? searchTerm(q) : "";
  if (term) query = query.or(`title.ilike.%${term}%,slug.ilike.%${term}%`);

  const { data, error, count } = await query
    .order("updated_at", { ascending: false })
    .order("id")
    .range(offset, offset + ADMIN_POSTS_PAGE_SIZE - 1)
    .overrideTypes<AdminPostListItem[], { merge: false }>();

  // PGRST103: the page starts past the last row. Empty page + the real total.
  if (error?.code === "PGRST103" && page > 1) {
    const first = await fetchAdminPosts({ status, category, q, page: 1 });
    return { ...first, items: [], page };
  }
  if (error) throw new Error(`listAdminPosts failed: ${error.message}`);
  const total = count ?? 0;
  return { items: data, total, page, pageCount: Math.max(1, Math.ceil(total / ADMIN_POSTS_PAGE_SIZE)) };
};

const fetchAdminPost: AdminPostsDriver["fetchAdminPost"] = async (id) => {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`getAdminPost failed: ${error.message}`);
  if (!data) return null;
  const links = await supabase.from("post_properties").select("property_id").eq("post_id", id).order("position");
  if (links.error) throw new Error(`getAdminPost links failed: ${links.error.message}`);
  return toAdminPost(data, links.data.map((link) => link.property_id));
};

const insertPost: AdminPostsDriver["insertPost"] = async (columns) => {
  const { data, error } = await createAdminClient().from("posts").insert(columns).select("id").single();
  if (error?.code === UNIQUE_VIOLATION) return { ok: false, reason: "slug_taken" };
  if (error?.code === FOREIGN_KEY_VIOLATION) return { ok: false, reason: "author_not_found" };
  if (error) throw new Error(`createPost failed: ${error.message}`);
  return { ok: true, id: data.id };
};

const updatePost: AdminPostsDriver["updatePost"] = async (id, columns) => {
  const { data, error } = await createAdminClient().from("posts").update(columns).eq("id", id).select("id");
  if (error?.code === UNIQUE_VIOLATION) return { ok: false, reason: "slug_taken" };
  if (error?.code === FOREIGN_KEY_VIOLATION) return { ok: false, reason: "author_not_found" };
  if (error) throw new Error(`updatePost failed: ${error.message}`);
  return data.length === 0 ? { ok: false, reason: "not_found" } : { ok: true };
};

/** `post_properties` rows go with the post (on delete cascade). */
const deletePost: AdminPostsDriver["deletePost"] = async (id) => {
  const { data, error } = await createAdminClient().from("posts").delete().eq("id", id).select("cover_key");
  if (error) throw new Error(`deletePost failed: ${error.message}`);
  const row = data[0];
  return row ? { ok: true, cover_key: row.cover_key } : { ok: false, reason: "not_found" };
};

/** Delete + insert (two statements, not one transaction): a failed insert leaves the post without links, and the admin retries. */
const replacePostProperties: AdminPostsDriver["replacePostProperties"] = async (id, propertyIds) => {
  const supabase = createAdminClient();
  const post = await supabase.from("posts").select("id").eq("id", id).maybeSingle();
  if (post.error) throw new Error(`setPostProperties failed: ${post.error.message}`);
  if (!post.data) return { ok: false, reason: "not_found" };

  const removed = await supabase.from("post_properties").delete().eq("post_id", id);
  if (removed.error) throw new Error(`setPostProperties failed: ${removed.error.message}`);
  if (propertyIds.length === 0) return { ok: true };

  const inserted = await supabase
    .from("post_properties")
    .insert(propertyIds.map((property_id, position) => ({ post_id: id, property_id, position })));
  if (inserted.error?.code === FOREIGN_KEY_VIOLATION) return { ok: false, reason: "property_not_found" };
  if (inserted.error) throw new Error(`setPostProperties failed: ${inserted.error.message}`);
  return { ok: true };
};

const setPostCover: AdminPostsDriver["setPostCover"] = async (id, cover) => {
  const supabase = createAdminClient();
  const current = await supabase.from("posts").select("cover_key").eq("id", id).maybeSingle();
  if (current.error) throw new Error(`setPostCover failed: ${current.error.message}`);
  if (!current.data) return { ok: false, reason: "not_found" };

  const { error } = await supabase
    .from("posts")
    .update({ cover_key: cover?.key ?? null, cover_alt: cover ? cover.alt : null })
    .eq("id", id);
  if (error) throw new Error(`setPostCover failed: ${error.message}`);
  return { ok: true, previous_key: current.data.cover_key };
};

export const supabaseAdminPostsDriver: AdminPostsDriver = {
  fetchAdminPosts,
  fetchAdminPost,
  insertPost,
  updatePost,
  deletePost,
  replacePostProperties,
  setPostCover,
};
