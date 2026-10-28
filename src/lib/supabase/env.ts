import { z } from "zod";

const publicEnvSchema = z.object({
  url: z.url(),
  anonKey: z.string().min(1),
});

export type SupabasePublicEnv = z.infer<typeof publicEnvSchema>;

/**
 * Public Supabase env, or null when it is not configured.
 * Read lazily (never at import time). `NEXT_PUBLIC_*` must be accessed
 * literally so Next.js can inline them into the client bundle.
 */
export const getSupabasePublicEnvOrNull = (): SupabasePublicEnv | null => {
  const parsed = publicEnvSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  return parsed.success ? parsed.data : null;
};

export const getSupabasePublicEnv = (): SupabasePublicEnv => {
  const env = getSupabasePublicEnvOrNull();
  if (!env) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return env;
};

export const getSupabaseServiceRoleKey = (): string => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Supabase admin client requires SUPABASE_SERVICE_ROLE_KEY.");
  }
  return key;
};
