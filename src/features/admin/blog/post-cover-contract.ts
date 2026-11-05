/** Blog cover upload contract shared by the editor (browser) and `POST /api/admin/post-covers`. Pure: no zod. */

/** Mirrors `POST_LIMITS.coverAlt` in `post-schemas.ts` (that file imports zod, which the browser bundle avoids). */
export const COVER_ALT_MAX = 200;

export const POST_COVER_URL = "/api/admin/post-covers";

/**
 * Multipart form: `post_id` (uuid), `ext` ("webp" | "jpg"), `width`, `height` (1..10000), `alt` (optional, up to
 * `COVER_ALT_MAX`), `cover` (the image, at most 5 MB, content type matching `ext`). The browser sends the widest
 * resized output (up to 1600 px); the post stores a single key.
 */
export type PostCoverResponse =
  | { ok: true; key: string; alt: string }
  | { ok: false; error: string };
