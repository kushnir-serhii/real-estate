import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import { getSupabasePublicEnvOrNull } from "./env";

/** Refreshes the Supabase auth session and syncs cookies onto the response. */
export const updateSession = async (request: NextRequest) => {
  const env = getSupabasePublicEnvOrNull();
  // Not configured (local without keys, CI): pass through without calling Supabase.
  if (!env) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Validates the JWT and refreshes it if needed. Do not run code between
  // createServerClient and this call.
  await supabase.auth.getClaims();

  return response;
};
