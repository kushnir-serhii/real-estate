import { resolveDataDriverFromEnv } from "./data-driver";

const LOCAL_SITE_URL = "http://localhost:3000";

const parse = (value: string): URL | null => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

/**
 * The site's public origin (canonical URLs, metadataBase, sitemap). Falls back to localhost for local work.
 * A production build without a valid `NEXT_PUBLIC_SITE_URL` fails on the `supabase` driver (set `SEO_ALLOW_LOCALHOST=1`
 * for local builds); on the `demo` driver it falls back to localhost (the build guard warns once).
 */
export const getSiteUrl = (env: Record<string, string | undefined> = process.env): string => {
  // Read literally so Next inlines it into client bundles too.
  const configured = (env === process.env ? process.env.NEXT_PUBLIC_SITE_URL : env.NEXT_PUBLIC_SITE_URL)?.trim();
  const parsed = configured ? parse(configured) : null;
  if (parsed) return parsed.origin;

  const isProductionBuild = env.NODE_ENV === "production" && env.NEXT_PHASE === "phase-production-build";
  if (isProductionBuild && env.SEO_ALLOW_LOCALHOST !== "1") {
    if (resolveDataDriverFromEnv(env) === "demo") {
      // The warning is printed once by the build guard (src/lib/build-guard.ts); this runs per build worker.
      return LOCAL_SITE_URL;
    }
    throw new Error(
      configured
        ? `NEXT_PUBLIC_SITE_URL is not a valid URL ("${configured}"). Set it to the production domain, e.g. https://7sky.example (or SEO_ALLOW_LOCALHOST=1 for a local build).`
        : "NEXT_PUBLIC_SITE_URL is empty. Set it to the production domain, e.g. https://7sky.example, before building (or SEO_ALLOW_LOCALHOST=1 for a local build).",
    );
  }
  return LOCAL_SITE_URL;
};
