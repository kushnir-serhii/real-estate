import { z } from "zod";
// Relative import: next.config.ts (build guard) loads this file without the "@/" alias.
import { getSupabasePublicEnvOrNull, hasSupabasePublicEnv } from "./supabase/env";

/**
 * Where the data comes from: `supabase` (Postgres + RLS) or `demo` (typed mock data in memory, no accounts, no Docker).
 * `DATA_DRIVER` empty: `supabase` when the public Supabase env is set, otherwise `demo`.
 */
export const DATA_DRIVERS = ["demo", "supabase"] as const;
export type DataDriver = (typeof DATA_DRIVERS)[number];

const dataDriverSchema = z.enum(DATA_DRIVERS);

/** Pure resolution: an invalid value fails loudly instead of silently picking a driver. */
export const resolveDataDriver = (raw: string | undefined, supabaseConfigured: boolean): DataDriver => {
  const value = raw?.trim();
  if (value) {
    const parsed = dataDriverSchema.safeParse(value);
    if (!parsed.success) {
      throw new Error(`Invalid DATA_DRIVER "${value}": use "demo" or "supabase", or leave it empty for auto.`);
    }
    return parsed.data;
  }
  return supabaseConfigured ? "supabase" : "demo";
};

/** Same on an explicit env object (site URL, build guard). */
export const resolveDataDriverFromEnv = (env: Record<string, string | undefined>): DataDriver =>
  resolveDataDriver(env.DATA_DRIVER, hasSupabasePublicEnv(env));

/** Read lazily (never at import time). */
export const getDataDriver = (): DataDriver =>
  resolveDataDriver(process.env.DATA_DRIVER, getSupabasePublicEnvOrNull() !== null);

export const isDemoMode = (): boolean => getDataDriver() === "demo";

/**
 * Can the public pages read data at all? Always in demo mode; on `supabase` only when its env is set
 * (otherwise pages render their empty states instead of failing).
 */
export const hasPublicData = (): boolean => isDemoMode() || getSupabasePublicEnvOrNull() !== null;
