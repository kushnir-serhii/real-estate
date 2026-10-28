import { NextResponse } from "next/server";
import { z } from "zod";

import { getPropertiesByIds } from "@/lib/db/properties";

const bodySchema = z.object({ ids: z.array(z.string().uuid()).max(100) });

/**
 * Cards' data for the visitor's saved ids (published or recently sold; the rest are left out).
 * A route handler rather than a server action: it is a read keyed by client-side state, and the
 * client wants plain JSON with its own loading / error / retry states.
 */
export const POST = async (request: Request) => {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  try {
    const items = await getPropertiesByIds([...new Set(parsed.data.ids)]);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
};
