import "server-only";
import {
  publishRequirements,
  type PropertyFormValues,
  type PropertySeoValues,
  type PublishRequirement,
} from "@/features/admin/properties/property-form-schema";
import { isDemoMode } from "@/lib/data-driver";
import { geocode, isGeocodeError } from "@/lib/geocode";
import type { Database } from "@/lib/supabase/database.types";
import { createSlug } from "@/lib/sync/slugify";
import { type AdminListStatus, type AdminPropertyFilters } from "./admin-property-filters";
import type { AdminPropertiesDriver } from "./driver-types";
import { derivePrice, nextSlug, planGeocode, type AddressState, type DerivedPrice } from "./property-derive";
import type { PropertiesMode } from "./property-permissions";
import { getSettings, type ExchangeRates } from "./settings";

export * from "./admin-property-filters";

type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];
type PhotoRow = Database["public"]["Tables"]["property_photos"]["Row"];

/** The driver is picked per call (env is read lazily) and loaded on demand, so the other one never enters the request. */
const loadDriver = async (): Promise<AdminPropertiesDriver> =>
  isDemoMode()
    ? (await import("@/lib/demo/db/admin-properties")).demoAdminPropertiesDriver
    : (await import("@/lib/db/supabase/admin-properties")).supabaseAdminPropertiesDriver;

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

/**
 * Properties for the admin list, most recently updated first. Runs with the signed-in user's
 * session: RLS lets an admin read every status (a non-admin sees only published ones).
 * A page past the last returns no items and the real total.
 */
export const getAdminProperties = async (filters: AdminPropertyFilters): Promise<AdminPropertyPage> =>
  (await loadDriver()).fetchAdminProperties(filters);

export type SourceSwitchCounts = {
  plektan: { total: number; published: number };
  admin: { total: number; published: number };
};

export type SourceSwitchSummary = SourceSwitchCounts & {
  mode: PropertiesMode;
  lastSyncAt: string | null;
};

/**
 * Counts for the source-switch confirm dialog. The caller must have checked `requireAdmin()` (the page does).
 * Counts run with the signed-in user's session: RLS (admin select policy) gives an admin every status.
 */
export const getSourceSwitchSummary = async (): Promise<SourceSwitchSummary> => {
  const [settings, counts] = await Promise.all([getSettings(), (await loadDriver()).fetchSourceSwitchCounts()]);
  return { mode: settings.properties_source, lastSyncAt: settings.last_sync_at, ...counts };
};

/** Writes the source of truth (service role). Call only after `requireAdmin()`. Rewrites no property rows. */
export const setPropertiesSource = async (mode: PropertiesMode): Promise<void> =>
  (await loadDriver()).setPropertiesSource(mode);

/**
 * Saves the exchange rates and recomputes `price_usd` of every priced property (both sources) in one
 * SQL function. Service role: call only after `requireAdmin()`. Returns how many rows changed.
 */
export const saveExchangeRates = async (rates: ExchangeRates): Promise<{ recomputed: number }> =>
  (await loadDriver()).saveExchangeRates(rates);

// ---- one property: read ---------------------------------------------------------

export type AdminPropertyPhoto = Pick<PhotoRow, "id" | "position" | "r2_key" | "sizes" | "width" | "height">;

export type AdminPropertyAgent = { id: string; name: string; is_active: boolean };

/** Every `properties` column except `raw` (the Plektan payload stays out of the admin), plus photos and agent. */
export type AdminProperty = Omit<PropertyRow, "raw"> & {
  photos: AdminPropertyPhoto[];
  agent: AdminPropertyAgent | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * One property for the edit page: all columns except `raw`, photos in order (cover first) and the agent.
 * Service role, because `house` is not granted to `authenticated`: THE CALLER MUST RUN `requireAdmin()` FIRST.
 * Returns null for an unknown or malformed id.
 */
export const getAdminProperty = async (id: string): Promise<AdminProperty | null> => {
  if (!UUID_PATTERN.test(id)) return null;
  return (await loadDriver()).fetchAdminProperty(id);
};

/** Active agents for the agent select (name order). Caller: admin only. */
export const getActiveAgents = async (): Promise<{ id: string; name: string }[]> =>
  (await loadDriver()).fetchActiveAgentOptions();

// ---- one property: write (the caller runs requireAdmin() and the mode check) ----

export type GeocodeStatus = "found" | "not_found" | "skipped" | "failed";

type Coords = { lat: number | null; lng: number | null };

/** Everything a create / save writes: the form values, the derived price columns and, when planned, the coordinates. */
export type PropertyWriteColumns = PropertyFormValues & DerivedPrice & Partial<Coords>;

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

const agentExists = async (driver: AdminPropertiesDriver, agentId: string | null): Promise<boolean> =>
  agentId === null ? true : driver.agentExists(agentId);

const formColumns = (values: PropertyFormValues, rates: ExchangeRates, patch: Coords | null): PropertyWriteColumns => ({
  ...values,
  ...derivePrice(values, rates),
  ...patch,
});

export type CreateAdminPropertyResult =
  | { ok: true; id: string; slug: string; geocode: GeocodeStatus }
  | { ok: false; reason: "agent_not_found" };

/** New property: `source = 'admin'`, `status = 'hidden'` (a draft), slug from the title. */
export const createAdminProperty = async (values: PropertyFormValues): Promise<CreateAdminPropertyResult> => {
  const driver = await loadDriver();
  if (!(await agentExists(driver, values.agent_id))) return { ok: false, reason: "agent_not_found" };
  const [{ exchange_rates }, coords] = await Promise.all([
    getSettings(),
    resolveCoords({ ...addressOf(values), lat: null, lng: null }, null),
  ]);
  const columns = formColumns(values, exchange_rates, coords.patch);

  for (let attempt = 1; attempt <= SLUG_ATTEMPTS; attempt += 1) {
    const result = await driver.insertProperty(columns, createSlug(values.title));
    if (result.ok) return { ok: true, id: result.id, slug: result.slug, geocode: coords.geocode };
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
  const driver = await loadDriver();
  if (!(await agentExists(driver, values.agent_id))) return { ok: false, reason: "agent_not_found" };
  const [{ exchange_rates }, coords] = await Promise.all([
    getSettings(),
    resolveCoords({ ...addressOf(values), lat: null, lng: null }, current),
  ]);
  const columns = formColumns(values, exchange_rates, coords.patch);
  const regenerate = nextSlug(current, values.title) !== null;

  for (let attempt = 1; attempt <= SLUG_ATTEMPTS; attempt += 1) {
    const result = await driver.updateProperty(id, columns, regenerate ? createSlug(values.title) : current.slug);
    if (result.ok) return { ok: true, slug: result.slug, previousSlug: current.slug, geocode: coords.geocode };
    if (result.reason === "not_found") return { ok: false, reason: "not_found" };
    // slug_taken: only a regenerated slug can collide with something else; a fixed one is a real error.
    if (!regenerate) throw new Error("updateAdminProperty failed: slug is taken");
  }
  throw new Error("updateAdminProperty failed: no slug attempts left");
};

export type PropertySlugResult = { ok: true; slug: string } | { ok: false; reason: "not_found" };

/** SEO overrides only (the only edit allowed in `plektan` mode). */
export const updateAdminPropertySeo = async (id: string, seo: PropertySeoValues): Promise<PropertySlugResult> =>
  (await loadDriver()).updatePropertySeo(id, seo);

export type PublishAdminPropertyResult =
  | { ok: true; slug: string }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "incomplete"; missing: PublishRequirement[] };

/** Publishes after checking deal, type, locality and title; sets `published_at` once (never moved later). */
export const publishAdminProperty = async (id: string): Promise<PublishAdminPropertyResult> => {
  const driver = await loadDriver();
  const row = await driver.fetchPublishFields(id);
  if (row === null) return { ok: false, reason: "not_found" };

  const missing = publishRequirements(row);
  if (missing.length > 0) return { ok: false, reason: "incomplete", missing };

  await driver.setPublished(id, row.published_at ?? new Date().toISOString());
  return { ok: true, slug: row.slug };
};

/** Hides a property (status `hidden`; the trigger stamps `hidden_at`, which starts the 7-day sold page). */
export const hideAdminProperty = async (id: string): Promise<PropertySlugResult> =>
  (await loadDriver()).hideProperty(id);

export type DeleteAdminDraftResult = PropertySlugResult | { ok: false; reason: "published" };

/**
 * Deletes a never-published property: its stored photos first (a failure aborts, the row stays and the delete
 * can be retried), then the row (photo rows cascade). Refuses when `published_at` is set.
 */
export const deleteAdminDraft = async (id: string): Promise<DeleteAdminDraftResult> =>
  (await loadDriver()).deleteDraft(id);
