import "server-only";
import {
  publishRequirements,
  type PropertyFormValues,
  type PropertySeoValues,
  type PublishRequirement,
} from "@/features/admin/properties/property-form-schema";
import { geocode, isGeocodeError } from "@/lib/geocode";
import { photoObjectKeys } from "@/lib/photos/photo-keys";
import { deleteObjects } from "@/lib/r2";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { createSlug } from "@/lib/sync/slugify";
import {
  ADMIN_PROPERTIES_PAGE_SIZE,
  propertySearchOr,
  type AdminListStatus,
  type AdminPropertyFilters,
} from "./admin-property-filters";
import { derivePrice, nextSlug, planGeocode, type AddressState } from "./property-derive";
import type { PropertiesMode } from "./property-permissions";
import { getSettings, type ExchangeRates } from "./settings";

export * from "./admin-property-filters";

type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];
type PhotoRow = Database["public"]["Tables"]["property_photos"]["Row"];

export type AdminPropertyCover = Pick<PhotoRow, "r2_key" | "sizes" | "width" | "height">;

export type AdminPropertyListItem = Pick<
  PropertyRow,
  | "id"
  | "slug"
  | "title"
  | "status"
  | "source"
  | "external_id"
  | "deal"
  | "property_type"
  | "price_amount"
  | "currency"
  | "locality"
  | "district"
  | "street"
  | "published_at"
  | "hidden_at"
  | "updated_at"
> & {
  listStatus: AdminListStatus;
  cover: AdminPropertyCover | null;
};

export type AdminPropertyPage = {
  items: AdminPropertyListItem[];
  total: number;
  page: number;
  pageCount: number;
};

type ListRow = Omit<AdminPropertyListItem, "listStatus" | "cover"> & { property_photos: AdminPropertyCover[] };

/** `raw` and `house` are not granted to authenticated: never select them. */
const LIST_SELECT =
  "id,slug,title,status,source,external_id,deal,property_type,price_amount,currency,locality,district,street,published_at,hidden_at,updated_at,property_photos(r2_key,sizes,width,height)";

const toListStatus = (status: PropertyRow["status"], publishedAt: string | null): AdminListStatus => {
  if (status === "published") return "published";
  return publishedAt === null ? "draft" : "hidden";
};

/**
 * Properties for the admin list, most recently updated first. Runs with the signed-in user's
 * session: RLS lets an admin read every status (a non-admin sees only published ones).
 * A page past the last returns no items and the real total.
 */
export const getAdminProperties = async (filters: AdminPropertyFilters): Promise<AdminPropertyPage> => {
  const supabase = await createClient();
  const offset = (filters.page - 1) * ADMIN_PROPERTIES_PAGE_SIZE;

  let query = supabase.from("properties").select(LIST_SELECT, { count: "exact" });
  if (filters.status === "published") query = query.eq("status", "published");
  if (filters.status === "hidden") query = query.eq("status", "hidden").not("published_at", "is", null);
  if (filters.status === "draft") query = query.eq("status", "hidden").is("published_at", null);
  if (filters.source !== "all") query = query.eq("source", filters.source);
  if (filters.deal !== "all") query = query.eq("deal", filters.deal);
  if (filters.type !== "all") query = query.eq("property_type", filters.type);
  if (filters.q) query = query.or(propertySearchOr(filters.q));

  const { data, error, count } = await query
    .eq("property_photos.position", 0)
    .order("updated_at", { ascending: false })
    .order("id")
    .range(offset, offset + ADMIN_PROPERTIES_PAGE_SIZE - 1)
    .overrideTypes<ListRow[], { merge: false }>();

  // PGRST103: the page starts past the last row. Empty page + the real total.
  if (error?.code === "PGRST103" && filters.page > 1) {
    const firstPage = await getAdminProperties({ ...filters, page: 1 });
    return { ...firstPage, items: [], page: filters.page };
  }
  if (error) throw new Error(`getAdminProperties failed: ${error.message}`);

  const total = count ?? 0;
  return {
    items: data.map(({ property_photos, ...row }) => ({
      ...row,
      listStatus: toListStatus(row.status, row.published_at),
      cover: property_photos[0] ?? null,
    })),
    total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_PROPERTIES_PAGE_SIZE)),
  };
};

export type SourceSwitchSummary = {
  mode: PropertiesMode;
  lastSyncAt: string | null;
  plektan: { total: number; published: number };
  admin: { total: number; published: number };
};

/**
 * Counts for the source-switch confirm dialog. The caller must have checked `requireAdmin()` (the page does).
 * Counts run with the signed-in user's session: RLS (admin select policy) gives an admin every status.
 */
export const getSourceSwitchSummary = async (): Promise<SourceSwitchSummary> => {
  const supabase = await createClient();
  const count = async (source: "plektan" | "admin", published: boolean): Promise<number> => {
    let query = supabase.from("properties").select("id", { count: "exact", head: true }).eq("source", source);
    if (published) query = query.eq("status", "published");
    const { count: total, error } = await query;
    if (error) throw new Error(`getSourceSwitchSummary failed: ${error.message}`);
    return total ?? 0;
  };

  const [settings, plektanTotal, plektanPublished, adminTotal, adminPublished] = await Promise.all([
    getSettings(),
    count("plektan", false),
    count("plektan", true),
    count("admin", false),
    count("admin", true),
  ]);

  return {
    mode: settings.properties_source,
    lastSyncAt: settings.last_sync_at,
    plektan: { total: plektanTotal, published: plektanPublished },
    admin: { total: adminTotal, published: adminPublished },
  };
};

/** Writes the source of truth (service role). Call only after `requireAdmin()`. Rewrites no property rows. */
export const setPropertiesSource = async (mode: PropertiesMode): Promise<void> => {
  const { error } = await createAdminClient()
    .from("settings")
    .update({ properties_source: mode })
    .not("id", "is", null);
  if (error) throw new Error(`setPropertiesSource failed: ${error.message}`);
};

/**
 * Saves the exchange rates and recomputes `price_usd` of every priced property (both sources) in one
 * SQL function. Service role: call only after `requireAdmin()`. Returns how many rows changed.
 */
export const saveExchangeRates = async (rates: ExchangeRates): Promise<{ recomputed: number }> => {
  const { data, error } = await createAdminClient().rpc("save_exchange_rates", {
    p_uah: rates.UAH,
    p_eur: rates.EUR,
  });
  if (error) throw new Error(`save_exchange_rates failed: ${error.message}`);
  return { recomputed: data ?? 0 };
};

// ---- one property: read ---------------------------------------------------------

export type AdminPropertyPhoto = Pick<PhotoRow, "id" | "position" | "r2_key" | "sizes" | "width" | "height">;

export type AdminPropertyAgent = { id: string; name: string; is_active: boolean };

/** Every `properties` column except `raw` (the Plektan payload stays out of the admin), plus photos and agent. */
export type AdminProperty = Omit<PropertyRow, "raw"> & {
  photos: AdminPropertyPhoto[];
  agent: AdminPropertyAgent | null;
};

const PROPERTY_COLUMNS =
  "id,source,external_id,status,deal,property_type,prop_kind,price_amount,currency,price_usd,price_per_m2,area_total,area_life,area_kitchen,area_lot,room_count,storey,storeys,repair,wall_material,housing_class,is_newbuilding,locality,district,street,house,lat,lng,title,description,slug,seo_title,seo_description,agent_id,source_updated_at,synced_at,published_at,hidden_at,created_at,updated_at";

const ONE_SELECT = `${PROPERTY_COLUMNS},property_photos(id,position,r2_key,sizes,width,height),agents(id,name,is_active)`;

type OneRow = Omit<AdminProperty, "photos" | "agent"> & {
  property_photos: AdminPropertyPhoto[];
  agents: AdminPropertyAgent | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * One property for the edit page: all columns except `raw`, photos in order (cover first) and the agent.
 * Service role, because `house` is not granted to `authenticated`: THE CALLER MUST RUN `requireAdmin()` FIRST.
 * Returns null for an unknown or malformed id.
 */
export const getAdminProperty = async (id: string): Promise<AdminProperty | null> => {
  if (!UUID_PATTERN.test(id)) return null;
  const { data, error } = await createAdminClient()
    .from("properties")
    .select(ONE_SELECT)
    .eq("id", id)
    .order("position", { referencedTable: "property_photos", ascending: true })
    .maybeSingle()
    .overrideTypes<OneRow, { merge: false }>();
  if (error) throw new Error(`getAdminProperty failed: ${error.message}`);
  if (data === null) return null;
  const { property_photos, agents, ...row } = data;
  return { ...row, photos: property_photos, agent: agents };
};

/** Active agents for the agent select (name order). Caller: admin only. */
export const getActiveAgents = async (): Promise<{ id: string; name: string }[]> => {
  const { data, error } = await createAdminClient()
    .from("agents")
    .select("id,name")
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error(`getActiveAgents failed: ${error.message}`);
  return data;
};

// ---- one property: write (service role; the caller runs requireAdmin() and the mode check) ----

export type GeocodeStatus = "found" | "not_found" | "skipped" | "failed";

type Coords = { lat: number | null; lng: number | null };

const UNIQUE_VIOLATION = "23505";
const SLUG_ATTEMPTS = 4;

const addressOf = (values: Pick<PropertyFormValues, "locality" | "district" | "street" | "house">) => ({
  locality: values.locality,
  district: values.district,
  street: values.street,
  house: values.house,
});

/** Geocodes when planned; never throws: a geocoder failure only clears / leaves the coordinates. */
const resolveCoords = async (
  next: AddressState,
  stored: AddressState | null,
): Promise<{ patch: Coords | null; geocode: GeocodeStatus }> => {
  const plan = planGeocode(next, stored);
  switch (plan.kind) {
    case "skip":
      return { patch: null, geocode: "skipped" };
    case "clear":
      return { patch: { lat: null, lng: null }, geocode: "skipped" };
    case "lookup":
      try {
        const found = await geocode(addressOf(next));
        if (found === null) return { patch: { lat: null, lng: null }, geocode: "not_found" };
        return { patch: { lat: found.lat, lng: found.lng }, geocode: "found" };
      } catch (error) {
        console.warn(`admin property geocoding failed: ${isGeocodeError(error) ? error.kind : "unknown error"}`);
        return { patch: { lat: null, lng: null }, geocode: "failed" };
      }
    default: {
      const unreachable: never = plan;
      return unreachable;
    }
  }
};

const agentExists = async (agentId: string | null): Promise<boolean> => {
  if (agentId === null) return true;
  const { data, error } = await createAdminClient().from("agents").select("id").eq("id", agentId).maybeSingle();
  if (error) throw new Error(`agent lookup failed: ${error.message}`);
  return data !== null;
};

const formColumns = (values: PropertyFormValues, rates: ExchangeRates) => ({
  ...values,
  ...derivePrice(values, rates),
});

export type CreateAdminPropertyResult =
  | { ok: true; id: string; slug: string; geocode: GeocodeStatus }
  | { ok: false; reason: "agent_not_found" };

/** New property: `source = 'admin'`, `status = 'hidden'` (a draft), slug from the title. */
export const createAdminProperty = async (values: PropertyFormValues): Promise<CreateAdminPropertyResult> => {
  if (!(await agentExists(values.agent_id))) return { ok: false, reason: "agent_not_found" };
  const [{ exchange_rates }, coords] = await Promise.all([
    getSettings(),
    resolveCoords({ ...addressOf(values), lat: null, lng: null }, null),
  ]);
  const columns = formColumns(values, exchange_rates);
  const admin = createAdminClient();

  for (let attempt = 1; attempt <= SLUG_ATTEMPTS; attempt += 1) {
    const slug = createSlug(values.title);
    const { data, error } = await admin
      .from("properties")
      .insert({ ...columns, ...coords.patch, source: "admin", status: "hidden", slug })
      .select("id,slug")
      .single();
    if (!error) return { ok: true, id: data.id, slug: data.slug, geocode: coords.geocode };
    if (error.code !== UNIQUE_VIOLATION || attempt === SLUG_ATTEMPTS) {
      throw new Error(`createAdminProperty failed: ${error.message}`);
    }
  }
  throw new Error("createAdminProperty failed: no slug attempts left");
};

/** What `updateAdminProperty` needs to know about the stored row (the caller already loaded it). */
export type AdminPropertyCurrent = Pick<
  AdminProperty,
  "title" | "slug" | "published_at" | "locality" | "district" | "street" | "house" | "lat" | "lng"
>;

export type UpdateAdminPropertyResult =
  | { ok: true; slug: string; previousSlug: string; geocode: GeocodeStatus }
  | { ok: false; reason: "not_found" | "agent_not_found" };

/**
 * Full save. Slug: regenerated from the title while `published_at` is null, never touched after the first
 * publish. Price columns are derived; coordinates re-geocoded when the address changed or are empty.
 */
export const updateAdminProperty = async (
  id: string,
  values: PropertyFormValues,
  current: AdminPropertyCurrent,
): Promise<UpdateAdminPropertyResult> => {
  if (!(await agentExists(values.agent_id))) return { ok: false, reason: "agent_not_found" };
  const [{ exchange_rates }, coords] = await Promise.all([
    getSettings(),
    resolveCoords({ ...addressOf(values), lat: null, lng: null }, current),
  ]);
  const columns = formColumns(values, exchange_rates);
  const admin = createAdminClient();
  const regenerate = nextSlug(current, values.title) !== null;

  for (let attempt = 1; attempt <= SLUG_ATTEMPTS; attempt += 1) {
    const slug = regenerate ? createSlug(values.title) : current.slug;
    const { data, error } = await admin
      .from("properties")
      .update({ ...columns, ...coords.patch, slug })
      .eq("id", id)
      .select("slug")
      .maybeSingle();
    if (!error) {
      if (data === null) return { ok: false, reason: "not_found" };
      return { ok: true, slug: data.slug, previousSlug: current.slug, geocode: coords.geocode };
    }
    if (error.code !== UNIQUE_VIOLATION || !regenerate || attempt === SLUG_ATTEMPTS) {
      throw new Error(`updateAdminProperty failed: ${error.message}`);
    }
  }
  throw new Error("updateAdminProperty failed: no slug attempts left");
};

export type PropertySlugResult = { ok: true; slug: string } | { ok: false; reason: "not_found" };

/** SEO overrides only (the only edit allowed in `plektan` mode). */
export const updateAdminPropertySeo = async (id: string, seo: PropertySeoValues): Promise<PropertySlugResult> => {
  const { data, error } = await createAdminClient()
    .from("properties")
    .update({ seo_title: seo.seo_title, seo_description: seo.seo_description })
    .eq("id", id)
    .select("slug")
    .maybeSingle();
  if (error) throw new Error(`updateAdminPropertySeo failed: ${error.message}`);
  return data === null ? { ok: false, reason: "not_found" } : { ok: true, slug: data.slug };
};

export type PublishAdminPropertyResult =
  | { ok: true; slug: string }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "incomplete"; missing: PublishRequirement[] };

/** Publishes after checking deal, type, locality and title; sets `published_at` once (never moved later). */
export const publishAdminProperty = async (id: string): Promise<PublishAdminPropertyResult> => {
  const admin = createAdminClient();
  const { data: row, error: readError } = await admin
    .from("properties")
    .select("slug,title,deal,property_type,locality,published_at")
    .eq("id", id)
    .maybeSingle();
  if (readError) throw new Error(`publishAdminProperty failed: ${readError.message}`);
  if (row === null) return { ok: false, reason: "not_found" };

  const missing = publishRequirements(row);
  if (missing.length > 0) return { ok: false, reason: "incomplete", missing };

  const { error } = await admin
    .from("properties")
    .update({ status: "published", published_at: row.published_at ?? new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`publishAdminProperty failed: ${error.message}`);
  return { ok: true, slug: row.slug };
};

/** Hides a property (status `hidden`; the trigger stamps `hidden_at`, which starts the 7-day sold page). */
export const hideAdminProperty = async (id: string): Promise<PropertySlugResult> => {
  const { data, error } = await createAdminClient()
    .from("properties")
    .update({ status: "hidden" })
    .eq("id", id)
    .select("slug")
    .maybeSingle();
  if (error) throw new Error(`hideAdminProperty failed: ${error.message}`);
  return data === null ? { ok: false, reason: "not_found" } : { ok: true, slug: data.slug };
};

export type DeleteAdminDraftResult = PropertySlugResult | { ok: false; reason: "published" };

/**
 * Deletes a never-published property: its R2 objects first (a failure aborts, the row stays and the delete
 * can be retried), then the row (photo rows cascade). Refuses when `published_at` is set.
 */
export const deleteAdminDraft = async (id: string): Promise<DeleteAdminDraftResult> => {
  const admin = createAdminClient();
  const { data: row, error: readError } = await admin
    .from("properties")
    .select("slug,published_at,property_photos(r2_key,sizes)")
    .eq("id", id)
    .maybeSingle();
  if (readError) throw new Error(`deleteAdminDraft failed: ${readError.message}`);
  if (row === null) return { ok: false, reason: "not_found" };
  if (row.published_at !== null) return { ok: false, reason: "published" };

  await deleteObjects(row.property_photos.flatMap(photoObjectKeys));
  // Re-check `published_at` in the same statement so a publish that raced us is never deleted.
  const { data: deleted, error } = await admin
    .from("properties")
    .delete()
    .eq("id", id)
    .is("published_at", null)
    .select("id");
  if (error) throw new Error(`deleteAdminDraft failed: ${error.message}`);
  if (deleted.length === 0) return { ok: false, reason: "published" };
  return { ok: true, slug: row.slug };
};
