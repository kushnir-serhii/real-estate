import "server-only";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { getCacheScope, isDemoMode } from "@/lib/data-driver";
import type { Database } from "@/lib/supabase/database.types";
import { CACHE_TAGS } from "./cache-tags";
import type { SettingsDriver } from "./driver-types";

/** Units of each currency per 1 USD. */
export const exchangeRatesSchema = z.object({
  UAH: z.number().positive(),
  EUR: z.number().positive(),
});
export type ExchangeRates = z.infer<typeof exchangeRatesSchema>;

type SettingsRow = Database["public"]["Tables"]["settings"]["Row"];
export type Settings = Omit<SettingsRow, "exchange_rates" | "id"> & { exchange_rates: ExchangeRates };

/** Rates used when the data can't be read, so public pages still render (matches the DB default). */
export const DEFAULT_EXCHANGE_RATES: ExchangeRates = { UAH: 41.5, EUR: 0.92 };

const loadDriver = async (): Promise<SettingsDriver> =>
  isDemoMode()
    ? (await import("@/lib/demo/db/settings")).demoSettingsDriver
    : (await import("@/lib/db/supabase/settings")).supabaseSettingsDriver;

/** The single settings row (service role on Supabase; not cached: sync and admin read it fresh). */
export const getSettings = async (): Promise<Settings> => (await loadDriver()).fetchSettings();

const getCachedExchangeRates = (): Promise<ExchangeRates> =>
  unstable_cache(
    async () => (await loadDriver()).fetchExchangeRates(),
    ["exchange-rates", getCacheScope()],
    { tags: [CACHE_TAGS.settings] },
  )();

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
