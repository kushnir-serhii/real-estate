import { photoUrl } from "./photo-url";

/** Valid `[width, key]` pairs of a photo's `sizes` json (`{ "<width>": "<r2 key>" }`), narrowest first. */
const sizeEntries = (sizes: unknown): (readonly [number, string])[] => {
  if (typeof sizes !== "object" || sizes === null || Array.isArray(sizes)) return [];
  return Object.entries(sizes)
    .map(([width, key]) => [Number(width), key] as const)
    .filter((e): e is readonly [number, string] => Number.isInteger(e[0]) && e[0] > 0 && typeof e[1] === "string")
    .sort((a, b) => a[0] - b[0]);
};

/** `srcset` from the stored sizes, or undefined when there are none (the original `src` is used). */
export const photoSrcSet = (sizes: unknown): string | undefined => {
  const entries = sizeEntries(sizes);
  return entries.length ? entries.map(([w, key]) => `${photoUrl(key)} ${w}w`).join(", ") : undefined;
};

/** URL of the widest stored size, falling back to the original key. */
export const largestPhotoUrl = (photo: { r2_key: string; sizes: unknown }): string => {
  const entries = sizeEntries(photo.sizes);
  const widest = entries.at(-1);
  return photoUrl(widest ? widest[1] : photo.r2_key);
};
