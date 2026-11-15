import "server-only";
import { unstable_cache } from "next/cache";
import { getCacheScope, isDemoMode } from "@/lib/data-driver";
import { CACHE_TAGS, propertyTag } from "./cache-tags";
import type { PropertiesDriver } from "./driver-types";
import { buildPriceHistogram } from "./property-histogram";
import { HISTOGRAM_DEFAULT_DEAL } from "./property-histogram-values";
import type { PriceHistogram } from "./property-histogram-values";
import type {
  FavoriteProperty,
  PropertyBySlug,
  PropertyFilters,
  PropertyPage,
  PublishedProperty,
  SimilarTo,
  SitemapProperty,
} from "./property-query";

// Filters, result types and constants live in `property-query.ts`; this facade keeps every import path stable.
export * from "./property-query";

/** The driver is picked per call (env is read lazily) and loaded on demand, so the other one never enters the request. */
const loadDriver = async (): Promise<PropertiesDriver> =>
  isDemoMode()
    ? (await import("@/lib/demo/db/properties")).demoPropertiesDriver
    : (await import("@/lib/db/supabase/properties")).supabasePropertiesDriver;

// The cache scope (driver, plus a per-process epoch on demo) is part of every cache key: a cache written by one driver, or by an earlier demo process, is never read.

/** Published properties, filtered, sorted and paginated. Cached under the `properties` tag. */
export const getPublishedProperties = (filters: PropertyFilters): Promise<PropertyPage> =>
  unstable_cache(
    async (f: PropertyFilters) => (await loadDriver()).fetchPublishedProperties(f),
    ["published-properties", getCacheScope(), JSON.stringify(filters)],
    { tags: [CACHE_TAGS.properties] },
  )(filters);

/**
 * Price histogram of the published properties matching `filters`, in USD. One deal only (`HISTOGRAM_DEFAULT_DEAL`
 * when none is given: sale, rent and daily prices are never mixed); the price bounds, sort and page are ignored,
 * so the chart shows the whole range around the visitor's selection. The drivers return the price list and the
 * binning is shared pure code. Cached under the `properties` tag.
 */
export const getPriceHistogram = (filters: PropertyFilters): Promise<PriceHistogram> => {
  const context: PropertyFilters = {
    ...filters,
    deal: filters.deal ?? HISTOGRAM_DEFAULT_DEAL,
    price_usd_from: undefined,
    price_usd_to: undefined,
    sort: "newest",
    page: 1,
  };
  return unstable_cache(
    async (f: PropertyFilters) => buildPriceHistogram(await (await loadDriver()).fetchPublishedPrices(f)),
    ["price-histogram", getCacheScope(), JSON.stringify(context)],
    { tags: [CACHE_TAGS.properties] },
  )(context);
};

/**
 * One property by slug: published, recently hidden («sold»), or null (unknown / hidden longer ago).
 * Cached under `property:<slug>`; revalidates hourly so the 7-day cut-off is honored.
 */
export const getPropertyBySlug = (slug: string): Promise<PropertyBySlug | null> =>
  unstable_cache(
    async (s: string) => (await loadDriver()).fetchPropertyBySlug(s),
    ["property-by-slug", getCacheScope(), slug],
    { tags: [CACHE_TAGS.properties, propertyTag(slug)], revalidate: 3600 },
  )(slug);

/**
 * Saved properties for /favorites: published or hidden less than SOLD_PAGE_DAYS ago, in the order of `ids`.
 * Unknown / removed ids are simply absent. Not cached: a small POST keyed by the visitor's own list.
 */
export const getPropertiesByIds = async (ids: string[]): Promise<FavoriteProperty[]> =>
  (await loadDriver()).fetchPropertiesByIds(ids);

/**
 * Up to 4 published properties with the same deal + type and `price_usd` within ±30%
 * (any price when the target's is unknown), excluding the target. Cached under `properties`.
 */
export const getSimilarProperties = (property: SimilarTo): Promise<PublishedProperty[]> => {
  const target: SimilarTo = {
    id: property.id,
    deal: property.deal,
    property_type: property.property_type,
    price_usd: property.price_usd,
  };
  return unstable_cache(
    async (t: SimilarTo) => (await loadDriver()).fetchSimilarProperties(t),
    ["similar-properties", getCacheScope(), JSON.stringify(target)],
    { tags: [CACHE_TAGS.properties] },
  )(target);
};

/** Distinct districts of published properties, sorted for Ukrainian. Cached under `properties`. */
export const getPublishedDistricts = (): Promise<string[]> =>
  unstable_cache(
    async () => (await loadDriver()).fetchPublishedDistricts(),
    ["published-districts", getCacheScope()],
    { tags: [CACHE_TAGS.properties] },
  )();

/** Slug + `updated_at` of every published property, for the sitemap. Cached under the `properties` tag. */
export const getSitemapProperties = (): Promise<SitemapProperty[]> =>
  unstable_cache(
    async () => (await loadDriver()).fetchSitemapProperties(),
    ["sitemap-properties", getCacheScope()],
    { tags: [CACHE_TAGS.properties] },
  )();
