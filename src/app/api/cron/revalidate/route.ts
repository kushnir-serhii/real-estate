import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({ tags: z.array(z.string().min(1)).max(500) });

const bytesOf = (text: string): Buffer => Buffer.from(text, "utf8");

/** Constant-time comparison that doesn't leak the secret's length either (both sides are padded to the same size). */
const secretMatches = (given: string, expected: string): boolean => {
  const size = Math.max(given.length, expected.length) * 4 + 4;
  const a = Buffer.alloc(size);
  const b = Buffer.alloc(size);
  bytesOf(given).copy(a);
  bytesOf(expected).copy(b);
  return timingSafeEqual(a, b) && bytesOf(given).length === bytesOf(expected).length;
};

const unauthorized = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

/** Called by the sync script after a run: purges the cache tags of what changed. */
export const POST = async (request: Request) => {
  const expected = process.env.CRON_SECRET ?? "";
  const header = request.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  // An unset secret must never authorize anything, not even an empty bearer.
  if (expected === "" || given === "" || !secretMatches(given, expected)) return unauthorized();

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const tags = [...new Set(parsed.data.tags)];
  // Expire immediately: the next request after a sync must see the new data.
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return NextResponse.json({ revalidated: tags.length });
};
