import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-session";
import { isDemoMode } from "@/lib/data-driver";
import { resetDemoData, revalidateAfterDemoReset } from "@/lib/demo/reset";

/** «Скинути демо-дані»: admin only, demo driver only (404 elsewhere). */

export const POST = async (request: Request) => {
  if (!isDemoMode()) return new NextResponse(null, { status: 404 });

  // Same-origin only: the cookie is SameSite=Lax, but a cross-site POST must not wipe the demo either.
  const origin = request.headers.get("origin");
  if (origin !== null && origin !== new URL(request.url).origin) {
    return NextResponse.json({ ok: false, error: "Запит відхилено." }, { status: 403 });
  }

  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: "Потрібно увійти" }, { status: 401 });
  }

  const { slugs } = resetDemoData();
  revalidateAfterDemoReset(slugs);
  return NextResponse.json({ ok: true });
};
