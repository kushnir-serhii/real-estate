import { MAX_PHOTO_WIDTH, type PhotoExt } from "@/features/admin/properties/photos/photo-limits";

/** Pure helpers for the upload route (validation of the multipart fields and the bytes). */

/** `w1200` -> 1200; null for anything else or a width outside 1..1600. */
export const parseWidthField = (name: string): number | null => {
  const match = /^w([1-9]\d{0,3})$/.exec(name);
  if (match === null) return null;
  const width = Number(match[1]);
  return width <= MAX_PHOTO_WIDTH ? width : null;
};

/** Main image: the 960 one, else the largest below 960, else the smallest (same rule as the sync). */
export const pickMainWidth = (widths: readonly number[]): number | null => {
  const sorted = [...widths].sort((a, b) => a - b);
  if (sorted.includes(960)) return 960;
  const below = sorted.filter((width) => width < 960);
  return below.at(-1) ?? sorted[0] ?? null;
};

/** Real file signature: RIFF....WEBP or FF D8 FF. */
export const hasImageMagic = (bytes: Uint8Array, ext: PhotoExt): boolean => {
  if (ext === "jpg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const ascii = (from: number, text: string): boolean => [...text].every((char, i) => bytes[from + i] === char.charCodeAt(0));
  return bytes.length >= 12 && ascii(0, "RIFF") && ascii(8, "WEBP");
};

/** `properties/<property_id>/<10 hex>-<w>.<ext>` */
export const photoKey = (propertyId: string, token: string, width: number, ext: PhotoExt): string =>
  `properties/${propertyId}/${token}-${width}.${ext}`;

export const randomToken = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};
