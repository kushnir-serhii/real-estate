import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabasePublicEnv, getSupabaseServiceRoleKey } from "./env";

/** Service-role client. Bypasses RLS: server code only (sync, admin actions, leads). */
export const createAdminClient = () => {
  const { url } = getSupabasePublicEnv();
  return createSupabaseClient<Database>(url, getSupabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};
