import "server-only";
import { ADMIN_PROPERTIES_PAGE_SIZE, externalIdQuery, toListStatus } from "@/lib/db/admin-property-filters";
import type { AdminPropertyFilters } from "@/lib/db/admin-property-filters";
import type {
  AdminProperty,
  AdminPropertyListItem,
  DeleteAdminDraftResult,
  PropertySlugResult,
} from "@/lib/db/admin-properties";
import type { AdminPropertiesDriver } from "@/lib/db/driver-types";
import type { ExchangeRates } from "@/lib/db/settings";
import type { Database } from "@/lib/supabase/database.types";
import { deleteDemoObjects, demoPhotoObjectKeys } from "../photos";
import { getDemoStore } from "../store";
import { toJson } from "./json";

type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];
type PhotoRow = Database["public"]["Tables"]["property_photos"]["Row"];

const SEARCH_COLUMNS = ["title", "locality", "district", "street"] as const;

const includesText = (value: string | null, needle: string): boolean => (value ?? "").toLowerCase().includes(needle);

/** The `.or()` search of the SQL query: an external id (digits) or a title, else title / locality / district / street. */
const matchesSearch = (row: PropertyRow, q: string): boolean => {
  const needle = q.toLowerCase();
  const id = externalIdQuery(q);
  if (id) return row.external_id === id || includesText(row.title, needle);
  return SEARCH_COLUMNS.some((column) => includesText(row[column], needle));
};

const matches = (row: PropertyRow, filters: AdminPropertyFilters): boolean => {
  if (filters.status !== "all" && toListStatus(row.status, row.published_at) !== filters.status) return false;
  if (filters.source !== "all" && row.source !== filters.source) return false;
  if (filters.deal !== "all" && row.deal !== filters.deal) return false;
  if (filters.type !== "all" && row.property_type !== filters.type) return false;
  if (filters.q && !matchesSearch(row, filters.q)) return false;
  return true;
};

const photosOf = (propertyId: string): PhotoRow[] =>
  getDemoStore()
    .property_photos.filter((photo) => photo.property_id === propertyId)
    .sort((a, b) => a.position - b.position);

/** ORDER BY updated_at DESC, id. */
const byUpdatedDesc = (a: PropertyRow, b: PropertyRow): number =>
  Date.parse(b.updated_at) - Date.parse(a.updated_at) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

const fetchAdminProperties: AdminPropertiesDriver["fetchAdminProperties"] = async (filters) => {
  const found = getDemoStore().properties.filter((row) => matches(row, filters)).sort(byUpdatedDesc);
  const total = found.length;
  const offset = (filters.page - 1) * ADMIN_PROPERTIES_PAGE_SIZE;
  const items = found.slice(offset, offset + ADMIN_PROPERTIES_PAGE_SIZE).map((row): AdminPropertyListItem => {
    const cover = photosOf(row.id).find((photo) => photo.position === 0);
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      status: row.status,
      source: row.source,
      external_id: row.external_id,
      deal: row.deal,
      property_type: row.property_type,
      price_amount: row.price_amount,
      currency: row.currency,
      locality: row.locality,
      district: row.district,
      street: row.street,
      published_at: row.published_at,
      hidden_at: row.hidden_at,
      updated_at: row.updated_at,
      listStatus: toListStatus(row.status, row.published_at),
      cover: cover ? { r2_key: cover.r2_key, sizes: toJson(cover.sizes), width: cover.width, height: cover.height } : null,
    };
  });
  return { items, total, page: filters.page, pageCount: Math.max(1, Math.ceil(total / ADMIN_PROPERTIES_PAGE_SIZE)) };
};

const fetchSourceSwitchCounts: AdminPropertiesDriver["fetchSourceSwitchCounts"] = async () => {
  const rows = getDemoStore().properties;
  const count = (source: PropertyRow["source"]) => ({
    total: rows.filter((row) => row.source === source).length,
    published: rows.filter((row) => row.source === source && row.status === "published").length,
  });
  return { plektan: count("plektan"), admin: count("admin") };
};

const setPropertiesSource: AdminPropertiesDriver["setPropertiesSource"] = async (mode) => {
  const settings = getDemoStore().settings;
  settings.properties_source = mode;
  settings.updated_at = new Date().toISOString();
};

const toUsd = (amount: number, currency: NonNullable<PropertyRow["currency"]>, rates: ExchangeRates): number =>
  currency === "USD" ? amount : Math.round(amount / (currency === "UAH" ? rates.UAH : rates.EUR));

/** The `save_exchange_rates` function: positive rates only; recomputes `price_usd`, counting the rows that changed. */
const saveExchangeRates: AdminPropertiesDriver["saveExchangeRates"] = async (rates) => {
  if (!(rates.UAH > 0) || !(rates.EUR > 0)) throw new Error("save_exchange_rates failed: rates must be positive");
  const store = getDemoStore();
  store.settings.exchange_rates = { UAH: rates.UAH, EUR: rates.EUR };
  store.settings.updated_at = new Date().toISOString();
  let recomputed = 0;
  for (const row of store.properties) {
    if (row.price_amount === null || row.currency === null) continue;
    const usd = toUsd(row.price_amount, row.currency, rates);
    if (row.price_usd === usd) continue;
    row.price_usd = usd;
    row.updated_at = new Date().toISOString();
    recomputed += 1;
  }
  return { recomputed };
};

const fetchAdminProperty: AdminPropertiesDriver["fetchAdminProperty"] = async (id) => {
  const store = getDemoStore();
  const row = store.properties.find((property) => property.id === id);
  if (!row) return null;
  const { raw, ...columns } = row;
  void raw;
  const agent = row.agent_id ? store.agents.find((candidate) => candidate.id === row.agent_id) : undefined;
  const property: AdminProperty = {
    ...columns,
    photos: photosOf(id).map((photo) => ({
      id: photo.id,
      position: photo.position,
      r2_key: photo.r2_key,
      sizes: toJson(photo.sizes),
      width: photo.width,
      height: photo.height,
    })),
    agent: agent ? { id: agent.id, name: agent.name, is_active: agent.is_active } : null,
  };
  return property;
};

const ukCollator = new Intl.Collator("uk");

const fetchActiveAgentOptions: AdminPropertiesDriver["fetchActiveAgentOptions"] = async () =>
  getDemoStore()
    .agents.filter((agent) => agent.is_active)
    .map(({ id, name }) => ({ id, name }))
    .sort((a, b) => ukCollator.compare(a.name, b.name));

const agentExists: AdminPropertiesDriver["agentExists"] = async (agentId) =>
  getDemoStore().agents.some((agent) => agent.id === agentId);

/** `slug text not null unique`. */
const slugTaken = (slug: string, exceptId: string | null): boolean =>
  getDemoStore().properties.some((row) => row.slug === slug && row.id !== exceptId);

const insertProperty: AdminPropertiesDriver["insertProperty"] = async (columns, slug) => {
  if (slugTaken(slug, null)) return { ok: false, reason: "slug_taken" };
  const now = new Date().toISOString();
  const row: PropertyRow = {
    // Column defaults of a new admin draft.
    lat: null,
    lng: null,
    raw: null,
    external_id: null,
    source_updated_at: null,
    synced_at: null,
    published_at: null,
    hidden_at: null,
    ...columns,
    id: crypto.randomUUID(),
    source: "admin",
    status: "hidden",
    slug,
    created_at: now,
    updated_at: now,
  };
  getDemoStore().properties.push(row);
  return { ok: true, id: row.id, slug: row.slug };
};

const updateProperty: AdminPropertiesDriver["updateProperty"] = async (id, columns, slug) => {
  const row = getDemoStore().properties.find((property) => property.id === id);
  if (!row) return { ok: false, reason: "not_found" };
  if (slugTaken(slug, id)) return { ok: false, reason: "slug_taken" };
  Object.assign(row, columns, { slug, updated_at: new Date().toISOString() });
  return { ok: true, slug: row.slug };
};

const updatePropertySeo: AdminPropertiesDriver["updatePropertySeo"] = async (id, seo): Promise<PropertySlugResult> => {
  const row = getDemoStore().properties.find((property) => property.id === id);
  if (!row) return { ok: false, reason: "not_found" };
  row.seo_title = seo.seo_title;
  row.seo_description = seo.seo_description;
  row.updated_at = new Date().toISOString();
  return { ok: true, slug: row.slug };
};

const fetchPublishFields: AdminPropertiesDriver["fetchPublishFields"] = async (id) => {
  const row = getDemoStore().properties.find((property) => property.id === id);
  if (!row) return null;
  const { slug, title, deal, property_type, locality, published_at } = row;
  return { slug, title, deal, property_type, locality, published_at };
};

/** `set_property_hidden_at`: leaving `hidden` for `published` clears `hidden_at`. */
const setPublished: AdminPropertiesDriver["setPublished"] = async (id, publishedAt) => {
  const row = getDemoStore().properties.find((property) => property.id === id);
  if (!row) return;
  if (row.status !== "published") row.hidden_at = null;
  row.status = "published";
  row.published_at = publishedAt;
  row.updated_at = new Date().toISOString();
};

/** `set_property_hidden_at`: a change to `hidden` stamps `hidden_at` only for a property that was published once. */
const hideProperty: AdminPropertiesDriver["hideProperty"] = async (id): Promise<PropertySlugResult> => {
  const row = getDemoStore().properties.find((property) => property.id === id);
  if (!row) return { ok: false, reason: "not_found" };
  if (row.status !== "hidden") row.hidden_at = row.published_at !== null ? new Date().toISOString() : null;
  row.status = "hidden";
  row.updated_at = new Date().toISOString();
  return { ok: true, slug: row.slug };
};

/**
 * Refuses a published one; otherwise drops the uploaded bytes and the row, mirroring the foreign keys:
 * photos cascade, `leads.property_id` and `ai_conversations.property_id` are set to null.
 */
const deleteDraft: AdminPropertiesDriver["deleteDraft"] = async (id): Promise<DeleteAdminDraftResult> => {
  const store = getDemoStore();
  const row = store.properties.find((property) => property.id === id);
  if (!row) return { ok: false, reason: "not_found" };
  if (row.published_at !== null) return { ok: false, reason: "published" };

  deleteDemoObjects(photosOf(id).flatMap(demoPhotoObjectKeys));
  store.property_photos = store.property_photos.filter((photo) => photo.property_id !== id);
  for (const lead of store.leads) if (lead.property_id === id) lead.property_id = null;
  for (const conversation of store.ai_conversations) if (conversation.property_id === id) conversation.property_id = null;
  store.properties = store.properties.filter((property) => property.id !== id);
  return { ok: true, slug: row.slug };
};

export const demoAdminPropertiesDriver: AdminPropertiesDriver = {
  fetchAdminProperties,
  fetchSourceSwitchCounts,
  setPropertiesSource,
  saveExchangeRates,
  fetchAdminProperty,
  fetchActiveAgentOptions,
  agentExists,
  insertProperty,
  updateProperty,
  updatePropertySeo,
  fetchPublishFields,
  setPublished,
  hideProperty,
  deleteDraft,
};
