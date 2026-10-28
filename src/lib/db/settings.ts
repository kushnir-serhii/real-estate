import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

/** Units of each currency per 1 USD. */
export const exchangeRatesSchema = z.object({
  UAH: z.number().positive(),
  EUR: z.number().positive(),
});
export type ExchangeRates = z.infer<typeof exchangeRatesSchema>;

type SettingsRow = Database["public"]["Tables"]["settings"]["Row"];
export type Settings = Omit<SettingsRow, "exchange_rates" | "id"> & { exchange_rates: ExchangeRates };

/** The single settings row (service role, not cached: sync and admin read it fresh). */
export const getSettings = async (): Promise<Settings> => {
  const { data, error } = await createAdminClient().from("settings").select("*").single();
  if (error) throw new Error(`getSettings failed: ${error.message}`);
  return {
    properties_source: data.properties_source,
    last_sync_at: data.last_sync_at,
    sync_cursor: data.sync_cursor,
    updated_at: data.updated_at,
    exchange_rates: exchangeRatesSchema.parse(data.exchange_rates),
  };
};
