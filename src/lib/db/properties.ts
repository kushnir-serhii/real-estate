import "server-only";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/public";
import type { Database } from "@/lib/supabase/database.types";
import { CACHE_TAGS, propertyTag } from "./cache-tags";
import { DEALS, PROP_KINDS, PROPERTY_TYPES } from "./property-values";

export const PAGE_SIZE = 12;

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
export type PublishedProperty = Omit<Tables["properties"]["Row"], "raw" | "agent_id"> & {
  property_photos: PropertyPhoto[];
  agent: PropertyAgent | null;
};

export type PropertyPage = {
  items: PublishedProperty[];
  total: number;
  page: number;
  pageCount: number;
};

const PROPERTY_COLUMNS = [
  "id", "source", "external_id", "status", "deal", "property_type", "prop_kind", "price_amount",
  "currency", "price_usd", "price_per_m2", "area_total", "area_life", "area_kitchen", "area_lot",
  "room_count", "storey", "storeys", "repair", "wall_material", "housing_class", "is_newbuilding",
  "locality", "district", "street", "house", "lat", "lng", "title", "description", "slug",
  "seo_title", "seo_description", "source_updated_at", "synced_at", "published_at", "created_at",
  "updated_at",
].join(",");

const SELECT = `${PROPERTY_COLUMNS}, property_photos(id,position,r2_key,width,height,sizes), agent:agents(id,name,phones,email,photo_url)`;

const SORT_ORDER = {
  price_asc: { column: "price_usd", ascending: true },
  price_desc: { column: "price_usd", ascending: false },
  area_asc: { column: "area_total", ascending: true },
  area_desc: { column: "area_total", ascending: false },
  newest: { column: "published_at", ascending: false },
} as const satisfies Record<(typeof SORTS)[number], { column: string; ascending: boolean }>;

const fetchPublishedProperties = async (filters: PropertyFilters): Promise<PropertyPage> => {
  const supabase = createPublicClient();
  const from = (filters.page - 1) * PAGE_SIZE;

  let query = supabase
    .from("properties")
    .select(SELECT, { count: "exact" })
    .eq("status", "published");
  if (filters.deal) query = query.eq("deal", filters.deal);
  if (filters.property_type) query = query.eq("property_type", filters.property_type);
  if (filters.prop_kind?.length) query = query.in("prop_kind", filters.prop_kind);
  if (filters.district?.length) query = query.in("district", filters.district);
  if (filters.price_usd_from !== undefined) query = query.gte("price_usd", filters.price_usd_from);
  if (filters.price_usd_to !== undefined) query = query.lte("price_usd", filters.price_usd_to);
  if (filters.area_from !== undefined) query = query.gte("area_total", filters.area_from);
  if (filters.area_to !== undefined) query = query.lte("area_total", filters.area_to);
  if (filters.rooms?.length) {
    const exact = filters.rooms.filter((r) => r !== "5+");
    const clauses = [
      ...(exact.length ? [`room_count.in.(${exact.join(",")})`] : []),
      ...(filters.rooms.includes("5+") ? ["room_count.gte.5"] : []),
    ];
    query = query.or(clauses.join(","));
  }

  const order = SORT_ORDER[filters.sort];
  const { data, error, count } = await query
    .order(order.column, { ascending: order.ascending, nullsFirst: false })
    .order("id")
    .order("position", { referencedTable: "property_photos" })
    .range(from, from + PAGE_SIZE - 1)
    .overrideTypes<PublishedProperty[], { merge: false }>();

  if (error) throw new Error(`getPublishedProperties failed: ${error.message}`);
  const total = count ?? 0;
  return {
    items: data,
    total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
};

/** Published properties, filtered, sorted and paginated. Cached under the `properties` tag. */
export const getPublishedProperties = (filters: PropertyFilters): Promise<PropertyPage> =>
  unstable_cache(fetchPublishedProperties, ["published-properties", JSON.stringify(filters)], {
    tags: [CACHE_TAGS.properties],
  })(filters);

const fetchPropertyBySlug = async (slug: string): Promise<PublishedProperty | null> => {
  const { data, error } = await createPublicClient()
    .from("properties")
    .select(SELECT)
    .eq("slug", slug)
    .eq("status", "published")
    .order("position", { referencedTable: "property_photos" })
    .maybeSingle()
    .overrideTypes<PublishedProperty, { merge: false }>();
  if (error) throw new Error(`getPropertyBySlug failed: ${error.message}`);
  return data;
};

/** One published property with its photos and agent, or null. Cached under `property:<slug>`. */
export const getPropertyBySlug = (slug: string): Promise<PublishedProperty | null> =>
  unstable_cache(fetchPropertyBySlug, ["property-by-slug", slug], {
    tags: [CACHE_TAGS.properties, propertyTag(slug)],
  })(slug);
