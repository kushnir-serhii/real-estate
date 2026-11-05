import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import { isDemoMode } from "@/lib/data-driver";
import { DEMO_ADMIN, DEMO_COOKIE_NAME, verifyDemoSession } from "@/lib/demo/session";
import { getSupabasePublicEnvOrNull } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type AdminSession =
  | { state: "unconfigured" }
  | { state: "anonymous" }
  | { state: "forbidden"; email: string }
  | { state: "admin"; email: string; userId: string };

/** Who is calling: one `getClaims` + one `is_admin()` call per request (shared by layout and page). */
export const getAdminSession = cache(async (): Promise<AdminSession> => {
  // Demo driver: the signed demo cookie, no Supabase call.
  if (isDemoMode()) {
    const session = await verifyDemoSession((await cookies()).get(DEMO_COOKIE_NAME)?.value);
    return session ? { state: "admin", email: DEMO_ADMIN.email, userId: DEMO_ADMIN.userId } : { state: "anonymous" };
  }

  if (!getSupabasePublicEnvOrNull()) return { state: "unconfigured" };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return { state: "anonymous" };

  const email = typeof claims.email === "string" ? claims.email : "";
  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error || isAdmin !== true) return { state: "forbidden", email };

  return { state: "admin", email, userId: claims.sub };
});

export type RequireAdminResult =
  | { ok: true; email: string; userId: string }
  | { ok: false; reason: "unconfigured" | "anonymous" | "forbidden" };

/** For server actions: returns a typed failure instead of throwing when the caller is not an admin. */
export const requireAdmin = async (): Promise<RequireAdminResult> => {
  const session = await getAdminSession();
  if (session.state === "admin") return { ok: true, email: session.email, userId: session.userId };
  return { ok: false, reason: session.state };
};
