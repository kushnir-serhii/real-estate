import "server-only";
import { isDemoMode } from "@/lib/data-driver";
import type { Json } from "@/lib/supabase/database.types";
import type { AdminPropertyPhotosDriver } from "./driver-types";

/**
 * Photo writes of the admin (service role). THE CALLER MUST RUN `requireAdmin()` AND CHECK
 * `canEditProperty(...).photos` FIRST. Positions are 0..n-1; the cover is position 0.
 */

export type NewPhotoRow = {
  r2_key: string;
  sizes: Record<string, string>;
  width: number;
  height: number;
};

export type StoredPhotoRow = {
  id: string;
  position: number;
  r2_key: string;
  sizes: Json | null;
  width: number | null;
  height: number | null;
};

export type PhotoWriteResult = { ok: true } | { ok: false; reason: "mismatch" };

const loadDriver = async (): Promise<AdminPropertyPhotosDriver> =>
  isDemoMode()
    ? (await import("@/lib/demo/db/admin-property-photos")).demoAdminPropertyPhotosDriver
    : (await import("@/lib/db/supabase/admin-property-photos")).supabaseAdminPropertyPhotosDriver;

export const countPhotos = async (propertyId: string): Promise<number> => (await loadDriver()).countPhotos(propertyId);

/**
 * Appends a photo at max(position) + 1. Two uploads can race for the same slot; the unique constraint
 * refuses the loser, which retries with a fresh maximum.
 */
export const appendPhoto = async (propertyId: string, photo: NewPhotoRow): Promise<StoredPhotoRow> =>
  (await loadDriver()).appendPhoto(propertyId, photo);

/** `orderedIds` must be exactly the property's photos. */
export const reorderPropertyPhotos = async (propertyId: string, orderedIds: readonly string[]): Promise<PhotoWriteResult> =>
  (await loadDriver()).reorderPropertyPhotos(propertyId, orderedIds);

/**
 * Deletes the row, closes the gap, then removes the stored objects (`placeholders/` keys are never touched).
 * If the object delete fails the row is already gone; that is logged, not reported (orphans are harmless).
 */
export const deletePropertyPhoto = async (propertyId: string, photoId: string): Promise<PhotoWriteResult> =>
  (await loadDriver()).deletePropertyPhoto(propertyId, photoId);
