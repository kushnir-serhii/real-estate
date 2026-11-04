import "server-only";
import type { SettingsDriver } from "@/lib/db/driver-types";
import { exchangeRatesSchema } from "@/lib/db/settings";
import type { ExchangeRates, Settings } from "@/lib/db/settings";
import { getDemoStore } from "../store";

const fetchExchangeRates = async (): Promise<ExchangeRates> =>
  exchangeRatesSchema.parse(getDemoStore().settings.exchange_rates);

const fetchSettings = async (): Promise<Settings> => {
  const row = getDemoStore().settings;
  return {
    properties_source: row.properties_source,
    last_sync_at: row.last_sync_at,
    sync_cursor: row.sync_cursor,
    updated_at: row.updated_at,
    exchange_rates: exchangeRatesSchema.parse(row.exchange_rates),
  };
};

export const demoSettingsDriver: SettingsDriver = { fetchSettings, fetchExchangeRates };
