import type { Agent } from "./agents";
import type { Page } from "./pages";
import type {
  FavoriteProperty,
  PropertyBySlug,
  PropertyFilters,
  PropertyPage,
  PublishedProperty,
  SimilarTo,
  SitemapProperty,
} from "./property-query";
import type { ExchangeRates, Settings } from "./settings";

/**
 * The public reads every data driver implements (spec 011). Callers never see this: they import the facades
 * in `src/lib/db/<domain>.ts`, which add caching and pick the driver. Implementations: `src/lib/db/supabase/`
 * (today's queries) and `src/lib/demo/db/` (in-memory store that mirrors the RLS rules).
 */
export type PropertiesDriver = {
  fetchPublishedProperties: (filters: PropertyFilters) => Promise<PropertyPage>;
  fetchPropertyBySlug: (slug: string) => Promise<PropertyBySlug | null>;
  fetchPropertiesByIds: (ids: string[]) => Promise<FavoriteProperty[]>;
  fetchSimilarProperties: (target: SimilarTo) => Promise<PublishedProperty[]>;
  fetchPublishedDistricts: () => Promise<string[]>;
  fetchSitemapProperties: () => Promise<SitemapProperty[]>;
};

export type PagesDriver = {
  fetchPage: (slug: string) => Promise<Page | null>;
};

export type AgentsDriver = {
  fetchActiveAgents: () => Promise<Agent[]>;
};

export type SettingsDriver = {
  fetchSettings: () => Promise<Settings>;
  fetchExchangeRates: () => Promise<ExchangeRates>;
};
