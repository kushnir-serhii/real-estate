/**
 * Photo upload contract shared by the admin UI and `POST /api/admin/photos`. Pure: safe for client components.
 */

/** Photos per property. */
export const MAX_PHOTOS = 40;
/** The file the user picks (before the browser resizes it): 30 MB. */
export const MAX_SOURCE_BYTES = 30 * 1024 * 1024;
/** Each file the browser sends to the route (after resizing): 5 MB. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
/** Output widths; never upscaled. When the source is narrower, the single output carries the source width. */
export const PHOTO_WIDTHS = [480, 960, 1600] as const;
/** The widest allowed output. */
export const MAX_PHOTO_WIDTH = 1600;
/** Largest `width` / `height` field the route accepts. */
export const MAX_PHOTO_DIMENSION = 10_000;

/** Types the file picker accepts (HEIC only where the browser can decode it). */
export const ACCEPTED_INPUT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;
/** Value for `<input type="file" accept>`. */
export const ACCEPT_ATTRIBUTE = ACCEPTED_INPUT_TYPES.join(",");

/** What the browser encodes: WebP, or JPEG where WebP encoding is unavailable (Safari). */
export type PhotoExt = "webp" | "jpg";
export const PHOTO_CONTENT_TYPES: Record<PhotoExt, string> = { webp: "image/webp", jpg: "image/jpeg" };

/**
 * Multipart form of `POST /api/admin/photos`:
 * - `property_id`: uuid; `ext`: "webp" | "jpg";
 * - `width`, `height`: integers 1..10000, size of the LARGEST output;
 * - 1 to 3 files, each named `w<real width>` (`w480`, `w960`, `w1600`, or e.g. `w1200` for a 1200 px source),
 *   widths distinct and 1..1600, each file at most `MAX_UPLOAD_BYTES`, content type matching `ext`.
 */
export type UploadedPhoto = {
  id: string;
  position: number;
  r2_key: string;
  sizes: Record<string, string>;
  width: number | null;
  height: number | null;
};

export type PhotoUploadResponse = { ok: true; photo: UploadedPhoto } | { ok: false; error: string };
