import "server-only";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { CACHE_TAGS } from "./cache-tags";

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

/** Rates used when Supabase can't be read, so public pages still render (matches the DB default). */
export const DEFAULT_EXCHANGE_RATES: ExchangeRates = { UAH: 41.5, EUR: 0.92 };

const fetchExchangeRates = async (): Promise<ExchangeRates> => {
  const { data, error } = await createAdminClient().from("settings").select("exchange_rates").single();
  if (error) throw new Error(`getExchangeRates failed: ${error.message}`);
  return exchangeRatesSchema.parse(data.exchange_rates);
};

const getCachedExchangeRates = unstable_cache(fetchExchangeRates, ["exchange-rates"], {
  tags: [CACHE_TAGS.settings],
});

/**
 * Exchange rates for public pages (catalog price filter). Service role on the server because
 * `settings` has no public read; only the rates leave this function. Cached under the `settings` tag.
 * Never throws: falls back to the default rates with a warning.
 */
export const getExchangeRates = async (): Promise<ExchangeRates> => {
  try {
    return await getCachedExchangeRates();
  } catch (error) {
    console.warn(
      "getExchangeRates: using default rates.",
      error instanceof Error ? error.message : error,
    );
    return DEFAULT_EXCHANGE_RATES;
  }
};
