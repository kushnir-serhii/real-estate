import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabasePublicEnv } from "./env";

/**
 * Cookie-less anon client for public reads (Server Components, cached reads).
 * Not reading cookies keeps pages static/ISR. RLS limits it to published data.
 */
export const createPublicClient = () => {
  const { url, anonKey } = getSupabasePublicEnv();
  return createSupabaseClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};
