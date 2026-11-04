import "server-only";
import type { PropertiesDriver } from "@/lib/db/driver-types";
import {
  PAGE_SIZE,
  SIMILAR_LIMIT,
  SIMILAR_PRICE_RANGE,
  SITEMAP_MAX_PROPERTIES,
  SOLD_PAGE_MS,
} from "@/lib/db/property-query";
import type {
  FavoriteProperty,
  PropertyBySlug,
  PropertyFilters,
  PropertyPage,
  PublishedProperty,
  SimilarTo,
  SitemapProperty,
  SORTS,
} from "@/lib/db/property-query";
import type { Database } from "@/lib/supabase/database.types";
import { getDemoStore } from "../store";
import type { DemoData } from "../store";

type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];

/**
 * RLS mirror (migration property_hidden_at): the public sees `published` rows, plus `hidden` rows whose
 * `hidden_at` is less than SOLD_PAGE_MS ago (the «sold» page). Drafts have no `hidden_at`, so they never show.
 */
const isPublished = (row: PropertyRow): boolean => row.status === "published";

const isSoldVisible = (row: PropertyRow): boolean => {
  if (row.status !== "hidden" || row.hidden_at === null) return false;
  const hiddenAt = Date.parse(row.hidden_at);
  return !Number.isNaN(hiddenAt) && Date.now() - hiddenAt < SOLD_PAGE_MS;
};

/**
 * What the public select returns: no `raw`, `house`, `agent_id` (column grants), photos of the visible row
 * ordered by position, the agent only while active (the agents policy) — a copy, never the store's own row.
 */
const toPublic = (row: PropertyRow, data: DemoData): PublishedProperty => {
  const { raw, house, agent_id, ...columns } = row;
  void raw;
  void house;
  const agent = data.agents.find((a) => a.id === agent_id && a.is_active);
  return {
    ...columns,
    property_photos: data.property_photos
      .filter((photo) => photo.property_id === row.id)
      .sort((a, b) => a.position - b.position)
      .map(({ id, position, r2_key, width, height, sizes }) => ({ id, position, r2_key, width, height, sizes })),
    agent: agent
      ? { id: agent.id, name: agent.name, phones: [...agent.phones], email: agent.email, photo_url: agent.photo_url }
      : null,
  };
};

/** The catalog filters, clause for clause as the SQL query applies them (a null column never matches a bound). */
const matchesFilters = (row: PropertyRow, filters: PropertyFilters): boolean => {
  if (filters.deal && row.deal !== filters.deal) return false;
  if (filters.property_type && row.property_type !== filters.property_type) return false;
  if (filters.prop_kind?.length && !filters.prop_kind.some((kind) => kind === row.prop_kind)) return false;
  if (filters.district?.length && !filters.district.some((name) => name === row.district)) return false;
  if (filters.price_usd_from !== undefined && !(row.price_usd !== null && row.price_usd >= filters.price_usd_from)) return false;
  if (filters.price_usd_to !== undefined && !(row.price_usd !== null && row.price_usd <= filters.price_usd_to)) return false;
  if (filters.area_from !== undefined && !(row.area_total !== null && row.area_total >= filters.area_from)) return false;
  if (filters.area_to !== undefined && !(row.area_total !== null && row.area_total <= filters.area_to)) return false;
  if (filters.rooms?.length) {
    const rooms = row.room_count;
    if (rooms === null) return false;
    const exact = filters.rooms.filter((r) => r !== "5+").map(Number);
    if (!(exact.includes(rooms) || (filters.rooms.includes("5+") && rooms >= 5))) return false;
  }
  return true;
};

const SORT_KEY = {
  price_asc: { value: (r: PropertyRow) => r.price_usd, ascending: true },
  price_desc: { value: (r: PropertyRow) => r.price_usd, ascending: false },
  area_asc: { value: (r: PropertyRow) => r.area_total, ascending: true },
  area_desc: { value: (r: PropertyRow) => r.area_total, ascending: false },
  newest: { value: (r: PropertyRow) => (r.published_at === null ? null : Date.parse(r.published_at)), ascending: false },
} as const satisfies Record<(typeof SORTS)[number], { value: (r: PropertyRow) => number | null; ascending: boolean }>;

const byId = (a: PropertyRow, b: PropertyRow): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** ORDER BY <column> [asc|desc] NULLS LAST, id. */
const comparator = (sort: PropertyFilters["sort"]) => {
  const { value, ascending } = SORT_KEY[sort];
  return (a: PropertyRow, b: PropertyRow): number => {
    const va = value(a);
    const vb = value(b);
    if (va === null && vb !== null) return 1;
    if (va !== null && vb === null) return -1;
    if (va !== null && vb !== null && va !== vb) return ascending ? va - vb : vb - va;
    return byId(a, b);
  };
};

const fetchPublishedProperties = async (filters: PropertyFilters): Promise<PropertyPage> => {
  const data = getDemoStore();
  const matches = data.properties.filter((row) => isPublished(row) && matchesFilters(row, filters)).sort(comparator(filters.sort));
  const total = matches.length;
  const from = (filters.page - 1) * PAGE_SIZE;
  return {
    // A page past the last row is not an error: empty page + the real total (as the Supabase driver does).
    items: matches.slice(from, from + PAGE_SIZE).map((row) => toPublic(row, data)),
    total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
};

const classify = (row: PropertyRow, data: DemoData): PropertyBySlug | null => {
  if (isPublished(row)) return { kind: "published", property: toPublic(row, data) };
  if (isSoldVisible(row)) return { kind: "sold", property: toPublic(row, data) };
  return null;
};

const fetchPropertyBySlug = async (slug: string): Promise<PropertyBySlug | null> => {
  const data = getDemoStore();
  const row = data.properties.find((p) => p.slug === slug);
  return row ? classify(row, data) : null;
};

const fetchPropertiesByIds = async (ids: string[]): Promise<FavoriteProperty[]> => {
  const data = getDemoStore();
  const result: FavoriteProperty[] = [];
  for (const id of ids) {
    const row = data.properties.find((p) => p.id === id);
    const found = row ? classify(row, data) : null;
    if (found) result.push(found);
  }
  return result;
};

const fetchSimilarProperties = async (target: SimilarTo): Promise<PublishedProperty[]> => {
  const data = getDemoStore();
  const low = target.price_usd === null ? null : Math.floor(target.price_usd * (1 - SIMILAR_PRICE_RANGE));
  const high = target.price_usd === null ? null : Math.ceil(target.price_usd * (1 + SIMILAR_PRICE_RANGE));
  return data.properties
    .filter(
      (row) =>
        isPublished(row) &&
        row.deal === target.deal &&
        row.property_type === target.property_type &&
        row.id !== target.id &&
        // Unknown target price: same deal + type only.
        (low === null || high === null || (row.price_usd !== null && row.price_usd >= low && row.price_usd <= high)),
    )
    .sort(comparator("newest"))
    .slice(0, SIMILAR_LIMIT)
    .map((row) => toPublic(row, data));
};

const ukCollator = new Intl.Collator("uk");

const fetchPublishedDistricts = async (): Promise<string[]> => {
  const names = new Set<string>();
  for (const row of getDemoStore().properties) {
    if (!isPublished(row)) continue;
    const name = row.district?.trim();
    if (name) names.add(name);
  }
  return [...names].sort(ukCollator.compare);
};

const fetchSitemapProperties = async (): Promise<SitemapProperty[]> =>
  getDemoStore()
    .properties.filter(isPublished)
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at) || byId(a, b))
    .slice(0, SITEMAP_MAX_PROPERTIES)
    .map(({ slug, updated_at }) => ({ slug, updated_at }));

export const demoPropertiesDriver: PropertiesDriver = {
  fetchPublishedProperties,
  fetchPropertyBySlug,
  fetchPropertiesByIds,
  fetchSimilarProperties,
  fetchPublishedDistricts,
  fetchSitemapProperties,
};
