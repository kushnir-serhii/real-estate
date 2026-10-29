import "server-only";

import { cache } from "react";
import { getSupabasePublicEnvOrNull } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type AdminSession =
  | { state: "unconfigured" }
  | { state: "anonymous" }
  | { state: "forbidden"; email: string }
  | { state: "admin"; email: string; userId: string };

/** Who is calling: one `getClaims` + one `is_admin()` call per request (shared by layout and page). */
export const getAdminSession = cache(async (): Promise<AdminSession> => {
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
