import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
import { DEALS, PROP_KINDS, PROPERTY_TYPES } from "./property-values";

/** Public property query: filters, result types and constants shared by the facade and both data drivers. */

export const PAGE_SIZE = 12;

/**
 * How long a hidden property stays reachable at its URL as a «sold» page (product decision, spec 005).
 * Mirrors the interval in the RLS policies of migration property_hidden_at.
 */
export const SOLD_PAGE_DAYS = 7;
export const SOLD_PAGE_MS = SOLD_PAGE_DAYS * 24 * 60 * 60 * 1000;

export const ROOM_OPTIONS = ["1", "2", "3", "4", "5+"] as const;
export const SORTS = ["price_asc", "price_desc", "area_asc", "area_desc", "newest"] as const;

/** URL value to array: accepts `a`, `a,b` or repeated params (`string[]`). */
const listOf = <T extends z.ZodType>(item: T) =>
  z.preprocess(
    (v) => {
      if (v === undefined || v === "") return undefined;
      const parts = Array.isArray(v) ? v : [v];
      return parts.flatMap((p) => (typeof p === "string" ? p.split(",") : [p])).filter((p) => p !== "");
    },
    z.array(item).optional(),
  );

const optionalNumber = z.preprocess(
  (v) => (v === undefined || v === "" ? undefined : v),
  z.coerce.number().nonnegative().optional(),
);

/**
 * Catalog filters, parsed from URL searchParams.
 * Price bounds are already normalized to USD (`price_usd`): the caller converts the visitor's
 * currency with the exchange rates, so this layer stays free of rates.
 */
export const propertyFiltersSchema = z.object({
  deal: z.enum(DEALS).optional(),
  property_type: z.enum(PROPERTY_TYPES).optional(),
  prop_kind: listOf(z.enum(PROP_KINDS)),
  rooms: listOf(z.enum(ROOM_OPTIONS)),
  price_usd_from: optionalNumber,
  price_usd_to: optionalNumber,
  area_from: optionalNumber,
  area_to: optionalNumber,
  district: listOf(z.string().min(1)),
  sort: z.enum(SORTS).default("newest"),
  page: z.coerce.number().int().min(1).catch(1).default(1),
});

export type PropertyFilters = z.infer<typeof propertyFiltersSchema>;
export type PropertyFiltersInput = z.input<typeof propertyFiltersSchema>;

type Tables = Database["public"]["Tables"];
export type PropertyPhoto = Pick<
  Tables["property_photos"]["Row"],
  "id" | "position" | "r2_key" | "width" | "height" | "sizes"
>;
export type PropertyAgent = Pick<
  Tables["agents"]["Row"],
  "id" | "name" | "phones" | "email" | "photo_url"
>;
export type PublishedProperty = Omit<Tables["properties"]["Row"], "raw" | "house" | "agent_id"> & {
  property_photos: PropertyPhoto[];
  agent: PropertyAgent | null;
};

export type PropertyPage = {
  items: PublishedProperty[];
  total: number;
  page: number;
  pageCount: number;
};

/** `published`: normal page. `sold`: hidden less than SOLD_PAGE_DAYS ago (page says it is sold, noindex). */
export type PropertyBySlug =
  | { kind: "published"; property: PublishedProperty }
  | { kind: "sold"; property: PublishedProperty };

export type FavoriteProperty = PropertyBySlug;

export type SimilarTo = Pick<PublishedProperty, "id" | "deal" | "property_type" | "price_usd">;

export type SitemapProperty = Pick<PublishedProperty, "slug" | "updated_at">;

export const SIMILAR_LIMIT = 4;
export const SIMILAR_PRICE_RANGE = 0.3;

/** A sitemap file holds at most 50 000 URLs; beyond that it would need a sitemap index (not needed for one agency). */
export const SITEMAP_MAX_PROPERTIES = 45_000;
