"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin-session";
import { getAdminProperty } from "@/lib/db/admin-properties";
import {
  deletePropertyPhoto,
  reorderPropertyPhotos,
  type PhotoWriteResult,
} from "@/lib/db/admin-property-photos";
import { canEditProperty } from "@/lib/db/property-permissions";
import { revalidateProperty } from "@/lib/db/revalidate-property";
import { getSettings } from "@/lib/db/settings";
import { MAX_PHOTOS } from "./photos/photo-limits";

/** Result of every photo action. `message` is Ukrainian and ready to show. */
export type PhotoActionResult = { ok: true } | { ok: false; message: string };

const NO_ACCESS = "Немає доступу";
const NOT_FOUND = "Об’єкт не знайдено. Можливо, його вже видалено.";
const READ_ONLY = "Фото зараз не можна змінювати: каталог веде Plektan.";
const STALE = "Список фото змінився. Оновіть сторінку й спробуйте ще раз.";
const GENERIC_ERROR = "Не вдалося зберегти зміни. Спробуйте ще раз.";

const idSchema = z.uuid();
const orderSchema = z.array(idSchema).max(MAX_PHOTOS);

const logFailure = (action: string, error: unknown): void => {
  console.error(`${action} failed: ${error instanceof Error ? error.message : "unknown error"}`);
};

type Prepared = { ok: true; slug: string | null } | { ok: false; message: string };

/** requireAdmin -> load -> `permissions.photos`. */
const prepare = async (propertyId: string): Promise<Prepared> => {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, message: NO_ACCESS };
  const property = await getAdminProperty(propertyId);
  if (property === null) return { ok: false, message: NOT_FOUND };
  const { properties_source } = await getSettings();
  if (!canEditProperty(properties_source, property.source).photos) return { ok: false, message: READ_ONLY };
  return { ok: true, slug: property.slug };
};

const finish = (propertyId: string, slug: string | null, result: PhotoWriteResult): PhotoActionResult => {
  if (!result.ok) return { ok: false, message: STALE };
  revalidateProperty(propertyId, [slug]);
  return { ok: true };
};

/** New order of ALL the property's photos (first = cover). `orderedIds` must be exactly the stored ids. */
export const reorderPhotos = async (propertyId: string, orderedIds: readonly string[]): Promise<PhotoActionResult> => {
  const parsedOrder = orderSchema.safeParse(orderedIds);
  if (!idSchema.safeParse(propertyId).success || !parsedOrder.success) return { ok: false, message: STALE };
  try {
    const prepared = await prepare(propertyId);
    if (!prepared.ok) return prepared;
    return finish(propertyId, prepared.slug, await reorderPropertyPhotos(propertyId, parsedOrder.data));
  } catch (error) {
    logFailure("reorderPhotos", error);
    return { ok: false, message: GENERIC_ERROR };
  }
};

/** Deletes the photo (row, compacts positions, then its R2 objects). */
export const deletePhoto = async (propertyId: string, photoId: string): Promise<PhotoActionResult> => {
  if (!idSchema.safeParse(propertyId).success || !idSchema.safeParse(photoId).success) return { ok: false, message: STALE };
  try {
    const prepared = await prepare(propertyId);
    if (!prepared.ok) return prepared;
    return finish(propertyId, prepared.slug, await deletePropertyPhoto(propertyId, photoId));
  } catch (error) {
    logFailure("deletePhoto", error);
    return { ok: false, message: "Не вдалося видалити фото. Спробуйте ще раз." };
  }
};
