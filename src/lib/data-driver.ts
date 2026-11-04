import { z } from "zod";
import { getSupabasePublicEnvOrNull } from "@/lib/supabase/env";

/**
 * Where the data comes from: `supabase` (Postgres + RLS) or `demo` (typed mock data in memory, no accounts, no Docker).
 * `DATA_DRIVER` empty: `supabase` when the public Supabase env is set, otherwise `demo`.
 */
export const DATA_DRIVERS = ["demo", "supabase"] as const;
export type DataDriver = (typeof DATA_DRIVERS)[number];

const dataDriverSchema = z.enum(DATA_DRIVERS);

/** Read lazily (never at import time). An invalid value fails loudly instead of silently picking a driver. */
export const getDataDriver = (): DataDriver => {
  const raw = process.env.DATA_DRIVER?.trim();
  if (raw) {
    const parsed = dataDriverSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Invalid DATA_DRIVER "${raw}": use "demo" or "supabase", or leave it empty for auto.`);
    }
    return parsed.data;
  }
  return getSupabasePublicEnvOrNull() === null ? "demo" : "supabase";
};

export const isDemoMode = (): boolean => getDataDriver() === "demo";

/**
 * Can the public pages read data at all? Always in demo mode; on `supabase` only when its env is set
 * (otherwise pages render their empty states instead of failing).
 */
export const hasPublicData = (): boolean => isDemoMode() || getSupabasePublicEnvOrNull() !== null;
