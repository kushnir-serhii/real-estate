import { ACCEPTED_INPUT_TYPES, MAX_PHOTOS, MAX_SOURCE_BYTES, PHOTO_WIDTHS } from "./photo-limits";

/** Pure checks and size math for the browser side of the photo upload. */

const ACCEPTED_EXTENSIONS = /\.(jpe?g|png|webp|hei[cf])$/i;
const BYTES_PER_MB = 1024 * 1024;

export const SOURCE_LIMIT_MB = MAX_SOURCE_BYTES / BYTES_PER_MB;

/** Hint under the «Додати фото» button. */
export const PHOTO_LIMITS_HINT = `До ${MAX_PHOTOS} фото, JPEG, PNG, WebP або HEIC до ${SOURCE_LIMIT_MB} МБ`;

const mbFormat = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 1 });

export const formatMegabytes = (bytes: number): string => `${mbFormat.format(bytes / BYTES_PER_MB)} МБ`;

const isAcceptedType = (type: string): boolean => ACCEPTED_INPUT_TYPES.some((accepted) => accepted === type);

/** HEIC / HEIF by type or name (Windows browsers often leave the type empty). */
export const isHeic = (file: Pick<File, "name" | "type">): boolean =>
  /^image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);

/** A plain Ukrainian reason why the file can't be used, or null when it can. */
export const checkPhotoFile = (file: Pick<File, "name" | "type" | "size">): string | null => {
  if (!isAcceptedType(file.type.toLowerCase()) && !ACCEPTED_EXTENSIONS.test(file.name)) {
    return "Це не фото. Підходять JPEG, PNG, WebP або HEIC.";
  }
  if (file.size === 0) return "Файл порожній.";
  if (file.size > MAX_SOURCE_BYTES) {
    return `Файл завеликий: ${formatMegabytes(file.size)}. Можна до ${SOURCE_LIMIT_MB} МБ.`;
  }
  return null;
};

/** Output widths, narrowest first, never wider than the source: 6000 -> 480/960/1600, 1200 -> 480/960/1200. */
export const outputWidths = (sourceWidth: number): number[] =>
  [...new Set(PHOTO_WIDTHS.map((width) => Math.min(width, sourceWidth)))].sort((a, b) => a - b);

/** Height at `width`, keeping the source proportions (at least 1 px). */
export const outputHeight = (sourceWidth: number, sourceHeight: number, width: number): number =>
  Math.max(1, Math.round((sourceHeight * width) / sourceWidth));

/** How many more photos may be queued. */
export const freeSlots = (stored: number, inProgress: number): number => Math.max(0, MAX_PHOTOS - stored - inProgress);
