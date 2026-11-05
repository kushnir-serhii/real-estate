"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin-session";
import { getAdminProperties } from "@/lib/db/admin-properties";
import { getAdminPost, setPostCover, setPostProperties } from "@/lib/db/admin-posts";
import { revalidatePost } from "@/lib/db/revalidate-post";
import { deletePostCoverObject } from "@/lib/photos/post-cover-storage";
import { pickerPropertyFromListItem } from "./post-picker-property";
import { COVER_ALT_MAX } from "./post-cover-contract";
import { RELATED_MAX } from "./post-media-values";
import type { PickerSearchResult, PostMediaResult } from "./post-media-values";

const NO_ACCESS = "Немає доступу";
const NOT_FOUND = "Статтю не знайдено. Можливо, її вже видалено.";
const GENERIC_ERROR = "Не вдалося зберегти зміни. Спробуйте ще раз.";

const idSchema = z.uuid();
const altSchema = z.string().trim().max(COVER_ALT_MAX, { error: `Опис: не більше ${COVER_ALT_MAX} символів` });
const idsSchema = z.array(idSchema).max(RELATED_MAX, { error: `Можна додати не більше ${RELATED_MAX} об’єктів` });
const querySchema = z.string().trim().max(100);

const logFailure = (action: string, error: unknown): void => {
  console.error(`${action} failed: ${error instanceof Error ? error.message : "unknown error"}`);
};

/** New alt text for the current cover (empty = the post title). Admin only. */
export const saveCoverAlt = async (postId: string, alt: string): Promise<PostMediaResult> => {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return { ok: false, message: NO_ACCESS };
    const parsedAlt = altSchema.safeParse(alt);
    if (!idSchema.safeParse(postId).success) return { ok: false, message: NOT_FOUND };
    if (!parsedAlt.success) return { ok: false, message: parsedAlt.error.issues[0]?.message ?? GENERIC_ERROR };
    const post = await getAdminPost(postId);
    if (!post) return { ok: false, message: NOT_FOUND };
    if (post.cover_key === null) return { ok: false, message: "Спочатку додайте обкладинку." };
    const result = await setPostCover(postId, { key: post.cover_key, alt: parsedAlt.data || post.title });
    if (!result.ok) return { ok: false, message: result.reason === "not_found" ? NOT_FOUND : GENERIC_ERROR };
    revalidatePost(postId, [result.slug]);
    return { ok: true };
  } catch (error) {
    logFailure("saveCoverAlt", error);
    return { ok: false, message: GENERIC_ERROR };
  }
};

/** Removes the cover and deletes its object (seed placeholders are never deleted). Admin only. */
export const removeCover = async (postId: string): Promise<PostMediaResult> => {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return { ok: false, message: NO_ACCESS };
    if (!idSchema.safeParse(postId).success) return { ok: false, message: NOT_FOUND };
    const result = await setPostCover(postId, null);
    if (!result.ok) return { ok: false, message: result.reason === "not_found" ? NOT_FOUND : GENERIC_ERROR };
    revalidatePost(postId, [result.slug]);
    await deletePostCoverObject(result.previous_key);
    return { ok: true };
  } catch (error) {
    logFailure("removeCover", error);
    return { ok: false, message: "Не вдалося прибрати обкладинку. Спробуйте ще раз." };
  }
};

/** Related properties: up to 3, array order = order on the post. Admin only. */
export const saveRelatedProperties = async (postId: string, propertyIds: readonly string[]): Promise<PostMediaResult> => {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return { ok: false, message: NO_ACCESS };
    const ids = idsSchema.safeParse(propertyIds);
    if (!idSchema.safeParse(postId).success) return { ok: false, message: NOT_FOUND };
    if (!ids.success) return { ok: false, message: ids.error.issues[0]?.message ?? GENERIC_ERROR };
    const result = await setPostProperties(postId, ids.data);
    if (!result.ok) {
      return {
        ok: false,
        message:
          result.reason === "not_found"
            ? NOT_FOUND
            : result.reason === "too_many"
              ? `Можна додати не більше ${RELATED_MAX} об’єктів`
              : "Об’єкт не знайдено. Можливо, його вже видалено.",
      };
    }
    revalidatePost(postId, [result.slug]);
    return { ok: true };
  } catch (error) {
    logFailure("saveRelatedProperties", error);
    return { ok: false, message: GENERIC_ERROR };
  }
};

const SEARCH_LIMIT = 8;

/** Published properties matching the text (title, address, slug, id), for the picker. Admin only. */
export const searchPickerProperties = async (query: string): Promise<PickerSearchResult> => {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return { ok: false, message: NO_ACCESS };
    const q = querySchema.safeParse(query);
    if (!q.success) return { ok: false, message: "Запит надто довгий." };
    const page = await getAdminProperties({
      status: "published",
      source: "all",
      deal: "all",
      type: "all",
      q: q.data === "" ? undefined : q.data,
      page: 1,
    });
    return { ok: true, items: page.items.slice(0, SEARCH_LIMIT).map(pickerPropertyFromListItem) };
  } catch (error) {
    logFailure("searchPickerProperties", error);
    return { ok: false, message: "Не вдалося виконати пошук. Спробуйте ще раз." };
  }
};
