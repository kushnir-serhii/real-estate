import "server-only";
import { z } from "zod";
import { BLOG_RELATED_MAX } from "@/constants/blog";
import { isDemoMode } from "@/lib/data-driver";
import type { AdminPostsDriver } from "./driver-types";
import { postCoverSchema, postInputSchema } from "./post-schemas";
import type { PostInput, PostInputRaw } from "./post-schemas";
import type { AdminPost, AdminPostFilters, AdminPostPage } from "./post-query";

export * from "./post-query";

/**
 * Blog posts for the admin (service role: the caller runs `requireAdmin()` first, like every admin facade, and
 * revalidates the `posts` / `post:<slug>` tags after a write). Drafts and published posts are both visible here.
 */

export type CreatePostResult =
  | { ok: true; id: string; slug: string }
  | { ok: false; reason: "slug_taken" | "author_not_found" }
  | { ok: false; reason: "invalid"; message: string };

export type UpdatePostResult =
  | { ok: true; slug: string }
  | { ok: false; reason: "slug_taken" | "slug_locked" | "author_not_found" | "not_found" }
  | { ok: false; reason: "invalid"; message: string };

export type DeletePostResult =
  | { ok: true; slug: string; cover_key: string | null }
  | { ok: false; reason: "not_found" };

export type SetPostPropertiesResult =
  | { ok: true; slug: string }
  | { ok: false; reason: "not_found" | "property_not_found" | "too_many" };

export type SetPostCoverResult =
  | { ok: true; slug: string; previous_key: string | null }
  | { ok: false; reason: "not_found" | "invalid" };

const loadDriver = async (): Promise<AdminPostsDriver> =>
  isDemoMode()
    ? (await import("@/lib/demo/db/admin-posts")).demoAdminPostsDriver
    : (await import("@/lib/db/supabase/admin-posts")).supabaseAdminPostsDriver;

const idSchema = z.uuid();

const parseInput = (input: PostInputRaw): { ok: true; values: PostInput } | { ok: false; message: string } => {
  const parsed = postInputSchema.safeParse(input);
  return parsed.success
    ? { ok: true, values: parsed.data }
    : { ok: false, message: parsed.error.issues[0]?.message ?? "Невірні дані" };
};

/** Posts of any status, newest edit first. */
export const listAdminPosts = async (filters: AdminPostFilters): Promise<AdminPostPage> =>
  (await loadDriver()).fetchAdminPosts(filters);

/** One post of any status with its related property ids, or null (unknown / malformed id). */
export const getAdminPost = async (id: string): Promise<AdminPost | null> =>
  idSchema.safeParse(id).success ? (await loadDriver()).fetchAdminPost(id) : null;

/** New post. `published_at` is set when it is created already published. */
export const createPost = async (input: PostInputRaw): Promise<CreatePostResult> => {
  const parsed = parseInput(input);
  if (!parsed.ok) return { ok: false, reason: "invalid", message: parsed.message };
  const { values } = parsed;
  const result = await (await loadDriver()).insertPost({
    ...values,
    published_at: values.status === "published" ? new Date().toISOString() : null,
  });
  return result.ok ? { ok: true, id: result.id, slug: values.slug } : result;
};

/**
 * Saves a post. `published_at` is set on the first publish and kept afterwards (unpublishing keeps it); the slug
 * can't change once the post has ever been published (it is in Google's index).
 */
export const updatePost = async (id: string, input: PostInputRaw): Promise<UpdatePostResult> => {
  const parsed = parseInput(input);
  if (!parsed.ok) return { ok: false, reason: "invalid", message: parsed.message };
  const { values } = parsed;
  const current = await getAdminPost(id);
  if (!current) return { ok: false, reason: "not_found" };
  if (current.published_at !== null && values.slug !== current.slug) return { ok: false, reason: "slug_locked" };

  const published_at = current.published_at ?? (values.status === "published" ? new Date().toISOString() : null);
  const result = await (await loadDriver()).updatePost(id, { ...values, published_at });
  return result.ok ? { ok: true, slug: values.slug } : result;
};

/** Deletes the post and its links; returns the cover key so the caller can delete the object from storage. */
export const deletePost = async (id: string): Promise<DeletePostResult> => {
  const current = await getAdminPost(id);
  if (!current) return { ok: false, reason: "not_found" };
  const result = await (await loadDriver()).deletePost(id);
  return result.ok ? { ok: true, slug: current.slug, cover_key: result.cover_key } : result;
};

/**
 * Related properties: at most `BLOG_RELATED_MAX`, order = position, duplicates dropped. Any existing property may
 * be linked; the public post only shows the published ones.
 */
export const setPostProperties = async (
  id: string,
  propertyIds: readonly string[],
): Promise<SetPostPropertiesResult> => {
  const distinct = [...new Set(propertyIds)];
  if (distinct.length > BLOG_RELATED_MAX) return { ok: false, reason: "too_many" };
  if (!distinct.every((value) => idSchema.safeParse(value).success)) return { ok: false, reason: "property_not_found" };
  const current = await getAdminPost(id);
  if (!current) return { ok: false, reason: "not_found" };
  const result = await (await loadDriver()).replacePostProperties(id, distinct);
  return result.ok ? { ok: true, slug: current.slug } : result;
};

/** Sets or removes (`null`) the cover; returns the old key so the caller can delete that object. */
export const setPostCover = async (
  id: string,
  cover: { key: string; alt?: string | null } | null,
): Promise<SetPostCoverResult> => {
  let value: { key: string; alt: string | null } | null = null;
  if (cover) {
    const parsed = postCoverSchema.safeParse(cover);
    if (!parsed.success) return { ok: false, reason: "invalid" };
    value = parsed.data;
  }
  const current = await getAdminPost(id);
  if (!current) return { ok: false, reason: "not_found" };
  const result = await (await loadDriver()).setPostCover(id, value);
  return result.ok ? { ok: true, slug: current.slug, previous_key: result.previous_key } : result;
};
