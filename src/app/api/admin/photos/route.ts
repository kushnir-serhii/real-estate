import { NextResponse } from "next/server";
import { z } from "zod";
import {
  MAX_PHOTOS,
  MAX_PHOTO_DIMENSION,
  MAX_UPLOAD_BYTES,
  PHOTO_CONTENT_TYPES,
  type PhotoUploadResponse,
} from "@/features/admin/properties/photos/photo-limits";
import { requireAdmin } from "@/lib/auth/admin-session";
import { getAdminProperty } from "@/lib/db/admin-properties";
import { appendPhoto, countPhotos } from "@/lib/db/admin-property-photos";
import { canEditProperty } from "@/lib/db/property-permissions";
import { revalidateProperty } from "@/lib/db/revalidate-property";
import { getSettings } from "@/lib/db/settings";
import { hasImageMagic, parseWidthField, photoKey, pickMainWidth, randomToken } from "@/lib/photos/photo-upload";
import { deleteObjects, putObject } from "@/lib/r2";

/**
 * Admin photo upload: the browser already resized the photo, this stores the 1-3 outputs in R2 and appends
 * a `property_photos` row. Form fields and limits: `photos/photo-limits.ts`. Workers-compatible: no sharp.
 */

const MAX_BODY_BYTES = 3 * MAX_UPLOAD_BYTES + 256 * 1024;

const fieldsSchema = z.object({
  property_id: z.uuid(),
  ext: z.enum(["webp", "jpg"]),
  width: z.coerce.number().int().min(1).max(MAX_PHOTO_DIMENSION),
  height: z.coerce.number().int().min(1).max(MAX_PHOTO_DIMENSION),
});

const fail = (status: number, error: string) => NextResponse.json<PhotoUploadResponse>({ ok: false, error }, { status });

export const POST = async (request: Request) => {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return admin.reason === "forbidden" ? fail(403, "Немає доступу") : fail(401, "Потрібно увійти");
  }

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return fail(413, "Файл завеликий. Спробуйте менше фото.");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "Не вдалося прочитати файли.");
  }

  const fields = fieldsSchema.safeParse({
    property_id: form.get("property_id"),
    ext: form.get("ext"),
    width: form.get("width"),
    height: form.get("height"),
  });
  if (!fields.success) return fail(400, "Некоректні дані фото.");
  const { property_id: propertyId, ext, width, height } = fields.data;

  // Files by real width: `w<width>`, 1 to 3, distinct.
  const files = new Map<number, File>();
  for (const [name, value] of form.entries()) {
    if (typeof value === "string") continue;
    const outputWidth = parseWidthField(name);
    if (outputWidth === null || files.has(outputWidth)) return fail(400, "Некоректні дані фото.");
    files.set(outputWidth, value);
  }
  if (files.size < 1 || files.size > 3) return fail(400, "Некоректні дані фото.");

  try {
    const property = await getAdminProperty(propertyId);
    const { properties_source } = await getSettings();
    if (property === null) return fail(404, "Об’єкт не знайдено. Можливо, його вже видалено.");
    if (!canEditProperty(properties_source, property.source).photos) {
      return fail(403, "Фото зараз не можна змінювати: каталог веде Plektan.");
    }
    if ((await countPhotos(propertyId)) >= MAX_PHOTOS) {
      return fail(409, `Можна додати не більше ${MAX_PHOTOS} фото до одного об’єкта.`);
    }

    const contentType = PHOTO_CONTENT_TYPES[ext];
    const outputs: { width: number; key: string; body: Uint8Array }[] = [];
    const token = randomToken();
    for (const [outputWidth, file] of [...files.entries()].sort((a, b) => a[0] - b[0])) {
      if (file.type !== contentType) return fail(415, "Підтримуються лише фото WebP або JPEG.");
      if (file.size > MAX_UPLOAD_BYTES) return fail(413, "Файл завеликий. Спробуйте менше фото.");
      const body = new Uint8Array(await file.arrayBuffer());
      if (!hasImageMagic(body, ext)) return fail(400, "Файл не схожий на фото.");
      outputs.push({ width: outputWidth, key: photoKey(propertyId, token, outputWidth, ext), body });
    }

    const mainWidth = pickMainWidth(outputs.map((output) => output.width));
    const main = outputs.find((output) => output.width === mainWidth);
    if (main === undefined) return fail(400, "Некоректні дані фото.");

    const keys = outputs.map((output) => output.key);
    try {
      for (const output of outputs) await putObject(output.key, output.body, contentType);
    } catch (error) {
      await deleteObjects(keys).catch(() => undefined);
      throw error;
    }

    const sizes: Record<string, string> = Object.fromEntries(outputs.map((output) => [String(output.width), output.key]));
    let photo;
    try {
      photo = await appendPhoto(propertyId, { r2_key: main.key, sizes, width, height });
    } catch (error) {
      await deleteObjects(keys).catch(() => undefined);
      throw error;
    }

    revalidateProperty(propertyId, [property.slug]);
    return NextResponse.json<PhotoUploadResponse>({
      ok: true,
      photo: { id: photo.id, position: photo.position, r2_key: photo.r2_key, sizes, width: photo.width, height: photo.height },
    });
  } catch (error) {
    console.error(`POST /api/admin/photos failed: ${error instanceof Error ? error.message : "unknown error"}`);
    return fail(500, "Не вдалося завантажити фото. Спробуйте ще раз.");
  }
};
