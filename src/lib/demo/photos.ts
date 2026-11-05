import "server-only";
import { DEMO_UPLOAD_PREFIX } from "@/lib/photos/photo-keys";

/**
 * Photos uploaded in demo mode: the bytes live in memory (per process, like the demo store), under keys with the
 * `demo-uploads/` prefix, and are served by `GET /api/demo/photos/[...key]`. Seed photos stay in `public/`.
 */

export type DemoObject = { body: Uint8Array; contentType: string };

const UPLOADS_KEY = "__demoUploads";
type UploadsGlobal = typeof globalThis & { [UPLOADS_KEY]?: Map<string, DemoObject> };

const uploads = (): Map<string, DemoObject> => {
  const holder: UploadsGlobal = globalThis;
  holder[UPLOADS_KEY] ??= new Map();
  return holder[UPLOADS_KEY];
};

const MB = 1024 * 1024;
const DEFAULT_PER_PHOTO_MB = 2;
const TOTAL_TO_PHOTO_RATIO = 20;

export type DemoUploadLimits = { perPhotoBytes: number; totalBytes: number };

/** `DEMO_UPLOAD_MAX_MB` = one photo; the total is 20 times that (empty: 2 MB per photo, 40 MB total). */
export const getDemoUploadLimits = (): DemoUploadLimits => {
  const parsed = Number(process.env.DEMO_UPLOAD_MAX_MB?.trim());
  const perPhotoMb = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PER_PHOTO_MB;
  return { perPhotoBytes: Math.round(perPhotoMb * MB), totalBytes: Math.round(perPhotoMb * MB * TOTAL_TO_PHOTO_RATIO) };
};

const formatMb = (bytes: number): string => `${Math.round((bytes / MB) * 10) / 10}`.replace(".", ",");

export const isDemoUploadKey = (key: string): boolean => key.startsWith(DEMO_UPLOAD_PREFIX);

export const demoUploadsSize = (): number => {
  let total = 0;
  for (const object of uploads().values()) total += object.body.byteLength;
  return total;
};

export type DemoCapsResult = { ok: true } | { ok: false; message: string };

/** `photoBytes`: everything one photo sends (all its sizes), counted on the uploaded bytes. */
export const checkDemoUploadCaps = (photoBytes: number): DemoCapsResult => {
  const { perPhotoBytes, totalBytes } = getDemoUploadLimits();
  if (photoBytes > perPhotoBytes) {
    return { ok: false, message: `У демо-режимі одне фото може важити до ${formatMb(perPhotoBytes)} МБ. Виберіть менше фото.` };
  }
  if (demoUploadsSize() + photoBytes > totalBytes) {
    return {
      ok: false,
      message: `У демо-режимі всі завантажені фото разом не можуть перевищувати ${formatMb(totalBytes)} МБ. Видаліть зайві або скиньте демо-дані.`,
    };
  }
  return { ok: true };
};

export const putDemoObject = (key: string, body: Uint8Array, contentType: string): void => {
  if (!isDemoUploadKey(key)) throw new Error("demo upload: invalid object key");
  uploads().set(key, { body: Uint8Array.from(body), contentType });
};

export const getDemoObject = (key: string): DemoObject | null => uploads().get(key) ?? null;

export const deleteDemoObjects = (keys: readonly string[]): void => {
  for (const key of keys) if (isDemoUploadKey(key)) uploads().delete(key);
};

/** Every key a photo row points to (main key and each size) that lives in the demo upload store. */
export const demoPhotoObjectKeys = (photo: { r2_key: string; sizes: unknown }): string[] => {
  const keys = new Set<string>([photo.r2_key]);
  const { sizes } = photo;
  if (typeof sizes === "object" && sizes !== null && !Array.isArray(sizes)) {
    for (const value of Object.values(sizes)) if (typeof value === "string") keys.add(value);
  }
  return [...keys].filter(isDemoUploadKey);
};

export const clearDemoUploads = (): void => {
  uploads().clear();
};
