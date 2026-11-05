"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin-session";
import { createPost, deletePost, getAdminPost, updatePost } from "@/lib/db/admin-posts";
import { revalidatePost } from "@/lib/db/revalidate-post";
import { deletePostCoverObject } from "@/lib/photos/post-cover-storage";
import { parsePostForm, readPostFormRaw, readPostIntent } from "./post-form-schema";
import type { PostDeleteState, PostFormState } from "./post-form-values";

const GENERIC_ERROR = "Не вдалося зберегти. Спробуйте ще раз.";
const DELETE_ERROR = "Не вдалося видалити. Спробуйте ще раз.";
const NO_ACCESS = "Немає доступу";
const NOT_FOUND = "Статтю не знайдено. Можливо, її вже видалено.";
const SLUG_TAKEN = "Така адреса вже використовується іншою статтею";
const SLUG_LOCKED = "Адресу опублікованої статті змінити не можна: вона вже в пошуку Google";
const AUTHOR_NOT_FOUND = "Автора не знайдено. Оберіть іншого.";

const idSchema = z.uuid();

const logFailure = (action: string, error: unknown): void => {
  // The message only: no form values.
  console.error(`${action} failed: ${error instanceof Error ? error.message : "unknown error"}`);
};

/**
 * Creates (no `id` in the form) or saves (`id` = uuid) a post. Admin only. Fields: see `readPostFormRaw`, plus
 * `intent` (`draft` | `publish`): publishing needs an excerpt and a body. Revalidates the blog, home and sitemap.
 */
export const savePost = async (_prev: PostFormState, formData: FormData): Promise<PostFormState> => {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return { status: "error", message: NO_ACCESS };

    const intent = readPostIntent(formData);
    const parsed = parsePostForm(readPostFormRaw(formData), intent);
    if (!parsed.ok) return { status: "invalid", errors: parsed.errors };

    const rawId = formData.get("id");
    if (rawId === null || rawId === "") {
      const created = await createPost(parsed.input);
      if (!created.ok) return failure(created);
      revalidatePost(created.id, [created.slug]);
      return { status: "created", id: created.id };
    }

    const id = idSchema.safeParse(rawId);
    if (!id.success) return { status: "error", message: NOT_FOUND };
    const before = await getAdminPost(id.data);
    if (!before) return { status: "error", message: NOT_FOUND };
    const updated = await updatePost(id.data, parsed.input);
    if (!updated.ok) return failure(updated);
    revalidatePost(id.data, [before.slug, updated.slug]);
    return { status: "saved", slug: updated.slug, published: intent === "publish" };
  } catch (error) {
    logFailure("savePost", error);
    return { status: "error", message: GENERIC_ERROR };
  }
};

type Failure =
  | { reason: "slug_taken" | "slug_locked" | "author_not_found" | "not_found" }
  | { reason: "invalid"; message: string };

const failure = (result: Failure): PostFormState => {
  switch (result.reason) {
    case "slug_taken":
      return { status: "invalid", errors: { slug: SLUG_TAKEN } };
    case "slug_locked":
      return { status: "invalid", errors: { slug: SLUG_LOCKED } };
    case "author_not_found":
      return { status: "invalid", errors: { author_agent_id: AUTHOR_NOT_FOUND } };
    case "not_found":
      return { status: "error", message: NOT_FOUND };
    case "invalid":
      return { status: "error", message: result.message };
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
};

/** Deletes a post and its links. Admin only. Field: `id`. Revalidates like a save. */
export const deletePostAction = async (_prev: PostDeleteState, formData: FormData): Promise<PostDeleteState> => {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return { status: "error", message: NO_ACCESS };
    const id = idSchema.safeParse(formData.get("id"));
    if (!id.success) return { status: "error", message: NOT_FOUND };
    const result = await deletePost(id.data);
    if (!result.ok) return { status: "error", message: NOT_FOUND };
    revalidatePost(id.data, [result.slug]);
    await deletePostCoverObject(result.cover_key);
    return { status: "deleted" };
  } catch (error) {
    logFailure("deletePostAction", error);
    return { status: "error", message: DELETE_ERROR };
  }
};
