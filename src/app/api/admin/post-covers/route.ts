import { NextResponse } from "next/server";
import { z } from "zod";
import { COVER_ALT_MAX, type PostCoverResponse } from "@/features/admin/blog/post-cover-contract";
import {
  MAX_PHOTO_DIMENSION,
  MAX_UPLOAD_BYTES,
  PHOTO_CONTENT_TYPES,
} from "@/features/admin/properties/photos/photo-limits";
import { requireAdmin } from "@/lib/auth/admin-session";
import { isDemoMode } from "@/lib/data-driver";
import { getAdminPost, setPostCover } from "@/lib/db/admin-posts";
import { revalidatePost } from "@/lib/db/revalidate-post";
import { checkDemoUploadCaps, deleteDemoObjects, putDemoObject } from "@/lib/demo/photos";
import { DEMO_UPLOAD_PREFIX } from "@/lib/photos/photo-keys";
import { hasImageMagic, postCoverKey, randomToken } from "@/lib/photos/photo-upload";
import { deletePostCoverObject } from "@/lib/photos/post-cover-storage";
import { deleteObjects, putObject } from "@/lib/r2";

/**
 * Admin blog cover upload: the browser already resized the photo (same pipeline as property photos), this stores
 * the file in R2 (`posts/<post_id>/…`) and points the post at it; the replaced object is deleted afterwards.
 * Demo driver: the bytes stay in memory under `demo-uploads/` and `GET /api/demo/photos/...` serves them.
 */

const MAX_BODY_BYTES = MAX_UPLOAD_BYTES + 256 * 1024;

const fieldsSchema = z.object({
  post_id: z.uuid(),
  ext: z.enum(["webp", "jpg"]),
  width: z.coerce.number().int().min(1).max(MAX_PHOTO_DIMENSION),
  height: z.coerce.number().int().min(1).max(MAX_PHOTO_DIMENSION),
  alt: z.string().trim().max(COVER_ALT_MAX).optional(),
});

const fail = (status: number, error: string) => NextResponse.json<PostCoverResponse>({ ok: false, error }, { status });

export const POST = async (request: Request) => {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.reason === "forbidden" ? fail(403, "Немає доступу") : fail(401, "Потрібно увійти");

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return fail(413, "Файл завеликий. Спробуйте менше фото.");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "Не вдалося прочитати файл.");
  }

  const altField = form.get("alt");
  const fields = fieldsSchema.safeParse({
    post_id: form.get("post_id"),
    ext: form.get("ext"),
    width: form.get("width"),
    height: form.get("height"),
    alt: typeof altField === "string" ? altField : undefined,
  });
  if (!fields.success) return fail(400, "Некоректні дані фото.");
  const { post_id: postId, ext } = fields.data;
  const file = form.get("cover");
  if (file === null || typeof file === "string") return fail(400, "Некоректні дані фото.");

  try {
    const post = await getAdminPost(postId);
    if (post === null) return fail(404, "Статтю не знайдено. Можливо, її вже видалено.");

    const contentType = PHOTO_CONTENT_TYPES[ext];
    if (file.type !== contentType) return fail(415, "Підтримуються лише фото WebP або JPEG.");
    if (file.size > MAX_UPLOAD_BYTES) return fail(413, "Файл завеликий. Спробуйте менше фото.");
    const body = new Uint8Array(await file.arrayBuffer());
    if (!hasImageMagic(body, ext)) return fail(400, "Файл не схожий на фото.");

    const demo = isDemoMode();
    if (demo) {
      const caps = checkDemoUploadCaps(body.byteLength);
      if (!caps.ok) return fail(413, caps.message);
    }

    const key = `${demo ? DEMO_UPLOAD_PREFIX : ""}${postCoverKey(postId, randomToken(), fields.data.width, ext)}`;
    if (demo) putDemoObject(key, body, contentType);
    else await putObject(key, body, contentType);

    const alt = fields.data.alt ? fields.data.alt : post.title.trim().slice(0, COVER_ALT_MAX);
    const removeNew = async (): Promise<void> => {
      if (demo) deleteDemoObjects([key]);
      else await deleteObjects([key]).catch(() => undefined);
    };
    let result;
    try {
      result = await setPostCover(postId, { key, alt });
    } catch (error) {
      await removeNew();
      throw error;
    }
    if (!result.ok) {
      await removeNew();
      return fail(result.reason === "not_found" ? 404 : 400, "Не вдалося зберегти обкладинку.");
    }

    revalidatePost(postId, [result.slug]);
    await deletePostCoverObject(result.previous_key);
    return NextResponse.json<PostCoverResponse>({ ok: true, key, alt });
  } catch (error) {
    console.error(`POST /api/admin/post-covers failed: ${error instanceof Error ? error.message : "unknown error"}`);
    return fail(500, "Не вдалося завантажити фото. Спробуйте ще раз.");
  }
};
