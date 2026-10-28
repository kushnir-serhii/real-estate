/**
 * Public URL of a stored photo.
 * - Absolute `http(s)` values (legacy / externally hosted agent photos) are returned as is.
 * - With `NEXT_PUBLIC_R2_PUBLIC_URL` set: `<base>/<key>` (R2).
 * - Base empty (local dev): the seed's `placeholders/…` keys come from `public/`, every other key
 *   from `public/r2-local/` where the sync's R2 fixture mode writes. Keys stay identical to production.
 */
export const photoUrl = (key: string): string => {
  if (/^https?:\/\//i.test(key)) return key;
  const base = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "").replace(/\/+$/, "");
  const path = key.replace(/^\/+/, "");
  if (base === "") return path.startsWith("placeholders/") ? `/${path}` : `/r2-local/${path}`;
  return `${base}/${path}`;
};
