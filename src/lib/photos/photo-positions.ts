/**
 * Pure planning of `property_photos.position` changes. `unique (property_id, position)` forbids two rows on one
 * slot, so the db layer applies the moves through parking positions (`PARKING_OFFSET + position`) first.
 */

export const PARKING_OFFSET = 100_000;

export type PositionedPhoto = { id: string; position: number };
export type PositionMove = { id: string; position: number };

const sameIds = (a: readonly string[], b: readonly string[]): boolean => {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return set.size === a.length && new Set(b).size === b.length && b.every((id) => set.has(id));
};

/** Rows that must change position so `finalOrder` (ids) becomes 0..n-1. Unchanged rows are left out. */
export const planOrder = (current: readonly PositionedPhoto[], finalOrder: readonly string[]): PositionMove[] => {
  const positions = new Map(current.map((photo) => [photo.id, photo.position]));
  return finalOrder.flatMap((id, position) => (positions.get(id) === position ? [] : [{ id, position }]));
};

const idsByPosition = (current: readonly PositionedPhoto[]): string[] =>
  [...current].sort((a, b) => a.position - b.position).map((photo) => photo.id);

export type PlanResult = { ok: true; moves: PositionMove[] } | { ok: false };

/** Explicit new order: `orderedIds` must be exactly the property's photos. */
export const planReorder = (current: readonly PositionedPhoto[], orderedIds: readonly string[]): PlanResult =>
  sameIds(current.map((photo) => photo.id), orderedIds) ? { ok: true, moves: planOrder(current, orderedIds) } : { ok: false };

/** `current` still contains the deleted photo; the result closes the gap so positions are 0..n-2 again. */
export const planCompactAfterDelete = (current: readonly PositionedPhoto[], photoId: string): PlanResult => {
  const ids = idsByPosition(current);
  if (!ids.includes(photoId)) return { ok: false };
  return { ok: true, moves: planOrder(current, ids.filter((id) => id !== photoId)) };
};
