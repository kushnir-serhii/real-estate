/** Pure helpers for the photo order (first = cover). */

type WithId = { id: string };

/** `list` with the photo moved to `toIndex` (clamped). Unknown id: an unchanged copy. */
export const movePhoto = <T extends WithId>(list: readonly T[], id: string, toIndex: number): T[] => {
  const from = list.findIndex((item) => item.id === id);
  if (from === -1) return [...list];
  const next = list.filter((item) => item.id !== id);
  const to = Math.min(Math.max(toIndex, 0), next.length);
  next.splice(to, 0, list[from]);
  return next;
};

/** Index to move to when dropped before / after `targetId`. Null when the drop changes nothing. */
export const dropIndex = (
  list: readonly WithId[],
  draggedId: string,
  targetId: string,
  side: "before" | "after",
): number | null => {
  const from = list.findIndex((item) => item.id === draggedId);
  const target = list.findIndex((item) => item.id === targetId);
  if (from === -1 || target === -1 || draggedId === targetId) return null;
  let to = side === "before" ? target : target + 1;
  if (from < to) to -= 1;
  return to === from ? null : to;
};

/**
 * The order to send: the wanted order of the photos the server has, then any stored ones missing locally
 * (the server needs exactly its own ids).
 */
export const orderPayload = (wanted: readonly string[], stored: readonly string[]): string[] => {
  const storedSet = new Set(stored);
  const kept = wanted.filter((id) => storedSet.has(id));
  const keptSet = new Set(kept);
  return [...kept, ...stored.filter((id) => !keptSet.has(id))];
};

export const sameOrder = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((id, i) => id === b[i]);
