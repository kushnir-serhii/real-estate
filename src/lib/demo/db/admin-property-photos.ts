import "server-only";
import type { StoredPhotoRow } from "@/lib/db/admin-property-photos";
import type { AdminPropertyPhotosDriver } from "@/lib/db/driver-types";
import { planCompactAfterDelete, planReorder } from "@/lib/photos/photo-positions";
import type { Database } from "@/lib/supabase/database.types";
import { deleteDemoObjects, demoPhotoObjectKeys } from "../photos";
import { getDemoStore } from "../store";
import { toJson } from "./json";

type PhotoRow = Database["public"]["Tables"]["property_photos"]["Row"];

const forProperty = (propertyId: string): PhotoRow[] =>
  getDemoStore()
    .property_photos.filter((photo) => photo.property_id === propertyId)
    .sort((a, b) => a.position - b.position);

const toStored = (photo: PhotoRow): StoredPhotoRow => ({
  id: photo.id,
  position: photo.position,
  r2_key: photo.r2_key,
  sizes: toJson(photo.sizes),
  width: photo.width,
  height: photo.height,
});

const countPhotos: AdminPropertyPhotosDriver["countPhotos"] = async (propertyId) => forProperty(propertyId).length;

/** The `property_id` foreign key and `unique (property_id, position)`: the new photo goes to max(position) + 1. */
const appendPhoto: AdminPropertyPhotosDriver["appendPhoto"] = async (propertyId, photo) => {
  const store = getDemoStore();
  if (!store.properties.some((property) => property.id === propertyId)) {
    throw new Error("appendPhoto failed: property_id violates foreign key constraint");
  }
  const last = forProperty(propertyId).at(-1);
  const row: PhotoRow = {
    id: crypto.randomUUID(),
    property_id: propertyId,
    position: (last?.position ?? -1) + 1,
    r2_key: photo.r2_key,
    sizes: toJson(photo.sizes),
    width: photo.width,
    height: photo.height,
    source_url: null,
    created_at: new Date().toISOString(),
  };
  store.property_photos.push(row);
  return toStored(row);
};

const reorderPropertyPhotos: AdminPropertyPhotosDriver["reorderPropertyPhotos"] = async (propertyId, orderedIds) => {
  const photos = forProperty(propertyId);
  const plan = planReorder(photos, orderedIds);
  if (!plan.ok) return { ok: false, reason: "mismatch" };
  for (const move of plan.moves) {
    const photo = photos.find((row) => row.id === move.id);
    if (photo) photo.position = move.position;
  }
  return { ok: true };
};

/** Deletes the row, closes the gap, then drops the uploaded bytes (seed `placeholders/` keys are never touched). */
const deletePropertyPhoto: AdminPropertyPhotosDriver["deletePropertyPhoto"] = async (propertyId, photoId) => {
  const photos = forProperty(propertyId);
  const target = photos.find((photo) => photo.id === photoId);
  const plan = planCompactAfterDelete(photos, photoId);
  if (target === undefined || !plan.ok) return { ok: false, reason: "mismatch" };
  const store = getDemoStore();
  store.property_photos = store.property_photos.filter((photo) => photo.id !== photoId);
  for (const move of plan.moves) {
    const photo = store.property_photos.find((row) => row.id === move.id);
    if (photo) photo.position = move.position;
  }
  deleteDemoObjects(demoPhotoObjectKeys(target));
  return { ok: true };
};

export const demoAdminPropertyPhotosDriver: AdminPropertyPhotosDriver = {
  countPhotos,
  appendPhoto,
  reorderPropertyPhotos,
  deletePropertyPhoto,
};
