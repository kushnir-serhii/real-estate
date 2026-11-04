import { isDemoMode } from "@/lib/data-driver";
import { getDemoObject } from "@/lib/demo/photos";
import { DEMO_UPLOAD_PREFIX } from "@/lib/photos/photo-keys";

/** Photos uploaded in demo mode, served from memory. 404 on the `supabase` driver and for unknown keys. */

const NOT_FOUND = () => new Response(null, { status: 404 });

const SAFE_TYPES = new Set(["image/webp", "image/jpeg"]);

export const GET = async (_request: Request, { params }: { params: Promise<{ key: string[] }> }) => {
  if (!isDemoMode()) return NOT_FOUND();
  const { key } = await params;
  const object = getDemoObject(`${DEMO_UPLOAD_PREFIX}${key.join("/")}`);
  if (object === null || !SAFE_TYPES.has(object.contentType)) return NOT_FOUND();
  return new Response(Uint8Array.from(object.body), {
    headers: {
      "Content-Type": object.contentType,
      "Content-Length": String(object.body.byteLength),
      // Keys are random per upload and never reused, so the bytes behind a key never change.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
};
