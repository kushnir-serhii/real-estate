import "server-only";
import { createPublicClient } from "@/lib/supabase/public";
import type { PropertiesDriver } from "../driver-types";
import { PAGE_SIZE, SIMILAR_LIMIT, SIMILAR_PRICE_RANGE, SITEMAP_MAX_PROPERTIES, SOLD_PAGE_MS } from "../property-query";
import type {
  FavoriteProperty,
  PropertyBySlug,
  PropertyFilters,
  PropertyPage,
  PublishedProperty,
  SimilarTo,
  SitemapProperty,
  SORTS,
} from "../property-query";

/** `raw` and `house` are not granted to the public (migration hide_private_property_columns): never select them here. */
const PROPERTY_COLUMNS = [
  "id", "source", "external_id", "status", "deal", "property_type", "prop_kind", "price_amount",
  "currency", "price_usd", "price_per_m2", "area_total", "area_life", "area_kitchen", "area_lot",
  "room_count", "storey", "storeys", "repair", "wall_material", "housing_class", "is_newbuilding",
  "locality", "district", "street", "lat", "lng", "title", "description", "slug",
  "seo_title", "seo_description", "source_updated_at", "synced_at", "published_at", "created_at",
  "updated_at", "hidden_at",
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

  // PGRST103: the page starts past the last row. Not an error for the visitor: empty page + real total.
  if (error?.code === "PGRST103" && filters.page > 1) {
    const first = await fetchPublishedProperties({ ...filters, page: 1 });
    return { ...first, items: [], page: filters.page };
  }
  if (error) throw new Error(`getPublishedProperties failed: ${error.message}`);
  const total = count ?? 0;
  return {
    items: data,
    total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
};

const fetchPropertyBySlug = async (slug: string): Promise<PropertyBySlug | null> => {
  const { data, error } = await createPublicClient()
    .from("properties")
    .select(SELECT)
    .eq("slug", slug)
    .in("status", ["published", "hidden"])
    .order("position", { referencedTable: "property_photos" })
    .maybeSingle()
    .overrideTypes<PublishedProperty, { merge: false }>();
  if (error) throw new Error(`getPropertyBySlug failed: ${error.message}`);
  if (!data) return null;
  if (data.status === "published") return { kind: "published", property: data };
  // Re-check the window: RLS already filters, but the cached result can outlive it.
  const hiddenAt = data.hidden_at ? Date.parse(data.hidden_at) : NaN;
  if (Number.isNaN(hiddenAt) || Date.now() - hiddenAt >= SOLD_PAGE_MS) return null;
  return { kind: "sold", property: data };
};

const fetchPropertiesByIds = async (ids: string[]): Promise<FavoriteProperty[]> => {
  if (ids.length === 0) return [];
  const { data, error } = await createPublicClient()
    .from("properties")
    .select(SELECT)
    .in("id", ids)
    .in("status", ["published", "hidden"])
    .order("position", { referencedTable: "property_photos" })
    .overrideTypes<PublishedProperty[], { merge: false }>();
  if (error) throw new Error(`getPropertiesByIds failed: ${error.message}`);
  const byId = new Map(data.map((row) => [row.id, row]));
  const result: FavoriteProperty[] = [];
  for (const id of ids) {
    const row = byId.get(id);
    if (!row) continue;
    if (row.status === "published") {
      result.push({ kind: "published", property: row });
      continue;
    }
    // Same window check as getPropertyBySlug (RLS already filters).
    const hiddenAt = row.hidden_at ? Date.parse(row.hidden_at) : NaN;
    if (!Number.isNaN(hiddenAt) && Date.now() - hiddenAt < SOLD_PAGE_MS) {
      result.push({ kind: "sold", property: row });
    }
  }
  return result;
};

const fetchSimilarProperties = async (target: SimilarTo): Promise<PublishedProperty[]> => {
  let query = createPublicClient()
    .from("properties")
    .select(SELECT)
    .eq("status", "published")
    .eq("deal", target.deal)
    .eq("property_type", target.property_type)
    .neq("id", target.id);
  // Unknown price: same deal + type only (newest first).
  if (target.price_usd !== null) {
    query = query
      .gte("price_usd", Math.floor(target.price_usd * (1 - SIMILAR_PRICE_RANGE)))
      .lte("price_usd", Math.ceil(target.price_usd * (1 + SIMILAR_PRICE_RANGE)));
  }
  const { data, error } = await query
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("id")
    .order("position", { referencedTable: "property_photos" })
    .limit(SIMILAR_LIMIT)
    .overrideTypes<PublishedProperty[], { merge: false }>();
  if (error) throw new Error(`getSimilarProperties failed: ${error.message}`);
  return data;
};

const ukCollator = new Intl.Collator("uk");

const fetchPublishedDistricts = async (): Promise<string[]> => {
  // PostgREST has no DISTINCT: read the column and dedupe here (bounded by the API row limit).
  const { data, error } = await createPublicClient()
    .from("properties")
    .select("district")
    .eq("status", "published")
    .not("district", "is", null);
  if (error) throw new Error(`getPublishedDistricts failed: ${error.message}`);
  const names = new Set<string>();
  for (const row of data) {
    const name = row.district?.trim();
    if (name) names.add(name);
  }
  return [...names].sort(ukCollator.compare);
};

/** PostgREST returns at most 1000 rows per request (Supabase default): read in pages of that size. */
const SITEMAP_BATCH = 1000;

const fetchSitemapProperties = async (): Promise<SitemapProperty[]> => {
  const supabase = createPublicClient();
  const result: SitemapProperty[] = [];
  for (let from = 0; result.length < SITEMAP_MAX_PROPERTIES; from += SITEMAP_BATCH) {
    const { data, error } = await supabase
      .from("properties")
      .select("slug,updated_at")
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .order("id")
      .range(from, from + SITEMAP_BATCH - 1);
    if (error) throw new Error(`getSitemapProperties failed: ${error.message}`);
    result.push(...data);
    if (data.length < SITEMAP_BATCH) break;
  }
  return result;
};

export const supabasePropertiesDriver: PropertiesDriver = {
  fetchPublishedProperties,
  fetchPropertyBySlug,
  fetchPropertiesByIds,
  fetchSimilarProperties,
  fetchPublishedDistricts,
  fetchSitemapProperties,
};
