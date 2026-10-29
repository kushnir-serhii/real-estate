import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { PropertiesMode } from "./property-permissions";
import { getSettings, type ExchangeRates } from "./settings";

export type SourceSwitchSummary = {
  mode: PropertiesMode;
  lastSyncAt: string | null;
  plektan: { total: number; published: number };
  admin: { total: number; published: number };
};

/**
 * Counts for the source-switch confirm dialog. The caller must have checked `requireAdmin()` (the page does).
 * Counts run with the signed-in user's session: RLS (admin select policy) gives an admin every status.
 */
export const getSourceSwitchSummary = async (): Promise<SourceSwitchSummary> => {
  const supabase = await createClient();
  const count = async (source: "plektan" | "admin", published: boolean): Promise<number> => {
    let query = supabase.from("properties").select("id", { count: "exact", head: true }).eq("source", source);
    if (published) query = query.eq("status", "published");
    const { count: total, error } = await query;
    if (error) throw new Error(`getSourceSwitchSummary failed: ${error.message}`);
    return total ?? 0;
  };

  const [settings, plektanTotal, plektanPublished, adminTotal, adminPublished] = await Promise.all([
    getSettings(),
    count("plektan", false),
    count("plektan", true),
    count("admin", false),
    count("admin", true),
  ]);

  return {
    mode: settings.properties_source,
    lastSyncAt: settings.last_sync_at,
    plektan: { total: plektanTotal, published: plektanPublished },
    admin: { total: adminTotal, published: adminPublished },
  };
};

/** Writes the source of truth (service role). Call only after `requireAdmin()`. Rewrites no property rows. */
export const setPropertiesSource = async (mode: PropertiesMode): Promise<void> => {
  const { error } = await createAdminClient()
    .from("settings")
    .update({ properties_source: mode })
    .not("id", "is", null);
  if (error) throw new Error(`setPropertiesSource failed: ${error.message}`);
};

/**
 * Saves the exchange rates and recomputes `price_usd` of every priced property (both sources) in one
 * SQL function. Service role: call only after `requireAdmin()`. Returns how many rows changed.
 */
export const saveExchangeRates = async (rates: ExchangeRates): Promise<{ recomputed: number }> => {
  const { data, error } = await createAdminClient().rpc("save_exchange_rates", {
    p_uah: rates.UAH,
    p_eur: rates.EUR,
  });
  if (error) throw new Error(`save_exchange_rates failed: ${error.message}`);
  return { recomputed: data ?? 0 };
};
