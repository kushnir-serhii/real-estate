// Relative imports only: next.config.ts loads this file without the "@/" alias.
import { resolveDataDriverFromEnv, type DataDriver } from "./data-driver";
import { hasSupabasePublicEnv } from "./supabase/env";

/**
 * Production-build guard. The `supabase` driver needs its public env at build time (`NEXT_PUBLIC_*` are inlined),
 * so a build without it fails with a clear message instead of shipping a site that can't reach its data.
 * The `demo` driver needs nothing. Returns the driver the build runs on.
 */
export const assertBuildEnv = (env: Record<string, string | undefined> = process.env): DataDriver => {
  const driver = resolveDataDriverFromEnv(env);
  if (driver === "supabase" && !hasSupabasePublicEnv(env)) {
    throw new Error(
      "DATA_DRIVER=supabase needs NEXT_PUBLIC_SUPABASE_URL (a valid URL) and NEXT_PUBLIC_SUPABASE_ANON_KEY at build time. " +
        "Set them (docs/setup.md), or unset DATA_DRIVER to build the demo.",
    );
  }
  return driver;
};

/** Warnings for a demo build (printed once from next.config.ts, which is where a single process runs). */
export const demoBuildWarnings = (env: Record<string, string | undefined> = process.env): string[] => {
  const url = env.NEXT_PUBLIC_SITE_URL?.trim();
  const usable = url !== undefined && url !== "" && URL.canParse(url);
  return usable || env.SEO_ALLOW_LOCALHOST === "1"
    ? []
    : [
        "NEXT_PUBLIC_SITE_URL is empty or invalid: canonical URLs use http://localhost:3000. Set it to the real domain before deploying.",
      ];
};
