import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SettingsDriver } from "../driver-types";
import { exchangeRatesSchema } from "../settings";
import type { ExchangeRates, Settings } from "../settings";

const fetchSettings = async (): Promise<Settings> => {
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

const fetchExchangeRates = async (): Promise<ExchangeRates> => {
  const { data, error } = await createAdminClient().from("settings").select("exchange_rates").single();
  if (error) throw new Error(`getExchangeRates failed: ${error.message}`);
  return exchangeRatesSchema.parse(data.exchange_rates);
};

export const supabaseSettingsDriver: SettingsDriver = { fetchSettings, fetchExchangeRates };
