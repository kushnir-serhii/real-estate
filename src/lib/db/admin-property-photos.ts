import "server-only";
import { photoObjectKeys } from "@/lib/photos/photo-keys";
import {
  PARKING_OFFSET,
  planCompactAfterDelete,
  planReorder,
  type PositionMove,
} from "@/lib/photos/photo-positions";
import { deleteObjects } from "@/lib/r2";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

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

const COLUMNS = "id,position,r2_key,sizes,width,height";
const UNIQUE_VIOLATION = "23505";
const INSERT_ATTEMPTS = 3;

export const countPhotos = async (propertyId: string): Promise<number> => {
  const { count, error } = await createAdminClient()
    .from("property_photos")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId);
  if (error) throw new Error(`countPhotos failed: ${error.message}`);
  return count ?? 0;
};

const listPhotos = async (propertyId: string): Promise<StoredPhotoRow[]> => {
  const { data, error } = await createAdminClient()
    .from("property_photos")
    .select(COLUMNS)
    .eq("property_id", propertyId)
    .order("position");
  if (error) throw new Error(`listPhotos failed: ${error.message}`);
  return data;
};

/**
 * Appends a photo at max(position) + 1. Two uploads can race for the same slot; the unique constraint
 * refuses the loser, which retries with a fresh maximum.
 */
export const appendPhoto = async (propertyId: string, photo: NewPhotoRow): Promise<StoredPhotoRow> => {
  const admin = createAdminClient();
  for (let attempt = 1; ; attempt += 1) {
    const { data: last, error: readError } = await admin
      .from("property_photos")
      .select("position")
      .eq("property_id", propertyId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (readError) throw new Error(`appendPhoto failed: ${readError.message}`);
    const { data, error } = await admin
      .from("property_photos")
      .insert({ property_id: propertyId, position: (last?.position ?? -1) + 1, source_url: null, ...photo })
      .select(COLUMNS)
      .single();
    if (!error) return data;
    if (error.code !== UNIQUE_VIOLATION || attempt >= INSERT_ATTEMPTS) throw new Error(`appendPhoto failed: ${error.message}`);
  }
};

/** Rows that change position move through a parking slot first, so the unique constraint never trips. */
const applyMoves = async (propertyId: string, moves: readonly PositionMove[]): Promise<void> => {
  const admin = createAdminClient();
  for (const move of moves) {
    const { error } = await admin
      .from("property_photos")
      .update({ position: PARKING_OFFSET + move.position })
      .eq("id", move.id)
      .eq("property_id", propertyId);
    if (error) throw new Error(`moving photos failed: ${error.message}`);
  }
  for (const move of moves) {
    const { error } = await admin
      .from("property_photos")
      .update({ position: move.position })
      .eq("id", move.id)
      .eq("property_id", propertyId);
    if (error) throw new Error(`moving photos failed: ${error.message}`);
  }
};

export type PhotoWriteResult = { ok: true } | { ok: false; reason: "mismatch" };

/** `orderedIds` must be exactly the property's photos. */
export const reorderPropertyPhotos = async (propertyId: string, orderedIds: readonly string[]): Promise<PhotoWriteResult> => {
  const plan = planReorder(await listPhotos(propertyId), orderedIds);
  if (!plan.ok) return { ok: false, reason: "mismatch" };
  await applyMoves(propertyId, plan.moves);
  return { ok: true };
};

/**
 * Deletes the row, closes the gap, then removes the R2 objects (`placeholders/` keys are never touched).
 * If the object delete fails the row is already gone; that is logged, not reported (orphans are harmless).
 */
export const deletePropertyPhoto = async (propertyId: string, photoId: string): Promise<PhotoWriteResult> => {
  const photos = await listPhotos(propertyId);
  const target = photos.find((photo) => photo.id === photoId);
  const plan = planCompactAfterDelete(photos, photoId);
  if (target === undefined || !plan.ok) return { ok: false, reason: "mismatch" };
  const { error } = await createAdminClient()
    .from("property_photos")
    .delete()
    .eq("id", photoId)
    .eq("property_id", propertyId);
  if (error) throw new Error(`deletePhoto failed: ${error.message}`);
  await applyMoves(propertyId, plan.moves);
  try {
    await deleteObjects(photoObjectKeys(target));
  } catch (objectsError) {
    // The photo is already gone from the property; an orphaned object in R2 is harmless.
    console.error(`deletePhoto: R2 objects not removed: ${objectsError instanceof Error ? objectsError.message : "unknown error"}`);
  }
  return { ok: true };
};
