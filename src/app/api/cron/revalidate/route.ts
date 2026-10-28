import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isCronAuthorized } from "@/lib/cron/check-cron-secret";

const bodySchema = z.object({ tags: z.array(z.string().min(1)).max(500) });

const unauthorized = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

/** Called by the sync script after a run: purges the cache tags of what changed. */
export const POST = async (request: Request) => {
  if (!isCronAuthorized(request)) return unauthorized();

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
