import "server-only";
import { CACHE_TAGS, propertyTag } from "@/lib/db/cache-tags";
import { DEALS, PROP_KINDS_BY_PROPERTY, PROPERTY_TYPES } from "@/lib/db/property-values";
import { getSettings } from "@/lib/db/settings";
import type { ExchangeRates } from "@/lib/db/settings";
import { geocode, isGeocodeError, resetGeocoder } from "@/lib/geocode";
import {
  getContactPersons,
  isPlektanError,
  searchAll,
  view,
  type PlektanContactPerson,
  type PlektanListItem,
  type PlektanSearchParams,
} from "@/lib/plektan";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";
import { createSlug, mapProperty, parseKyivDateTime } from "./map-property";
import { createSyncCursor } from "./sync-cursor";
import { createPhotoStats, syncAgentPhotos, syncPropertyPhotos, type PhotoStats } from "./sync-photos";

export type SyncMode = "full" | "incremental";

export type RunSyncOptions = {
  mode: SyncMode;
  /** Hide vanished properties even when the safety guard would refuse. */
  forceHide?: boolean;
  /** Injectable clock for tests and the local check. */
  now?: () => Date;
  /** Receives progress lines (never secrets or personal data). Defaults to `console.log`. */
  log?: (message: string) => void;
};

export type SyncSummary = {
  /** The mode that actually ran: an incremental run without a cursor becomes full. */
  mode: SyncMode;
  added: number;
  updated: number;
  hidden: number;
  unchanged: number;
  /** Items Plektan returned that we don't publish (`mls`, not actual, unsupported). */
  skipped: number;
  /** Items whose `view` / write failed; the run goes on, the cursor doesn't advance. */
  failed: number;
  agents: { added: number; updated: number; deactivated: number };
  /** Photo work of this run: a re-run with nothing changed has all zeros. */
  photos: PhotoStats;
  /** Geocoder lookups of this run: `calls` = addresses looked up, `found` = coordinates saved/confirmed, `failed` = no result or an error. */
  geocode: GeocodeStats;
  /** The guard refused to hide vanished properties (see `warnings`). */
  hideBlocked: boolean;
  warnings: string[];
};

export type GeocodeStats = { calls: number; found: number; failed: number };

export type SyncResult =
  | { status: "skipped"; reason: string }
  | { status: "done"; summary: SyncSummary; tags: string[] };

type Admin = ReturnType<typeof createAdminClient>;
type PropertyInsert = TablesInsert<"properties">;
type PropertyUpdate = TablesUpdate<"properties">;

type ExistingProperty = {
  id: string;
  external_id: string | null;
  slug: string;
  status: "published" | "hidden";
  source_updated_at: string | null;
  published_at: string | null;
  agent_id: string | null;
  locality: string | null;
  district: string | null;
  street: string | null;
  house: string | null;
  lat: number | null;
  lng: number | null;
};

type ExistingAgent = {
  id: string;
  external_id: string | null;
  name: string;
  phones: string[];
  email: string | null;
  is_active: boolean;
};

const PAGE = 1000;
const CHUNK = 100;
const UNIQUE_VIOLATION = "23505";

const chunks = <T>(items: readonly T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

const fail = (what: string, error: { message: string }): never => {
  throw new Error(`sync: ${what} failed: ${error.message}`);
};

const sameInstant = (a: string | null, b: string | null): boolean =>
  a !== null && b !== null && new Date(a).getTime() === new Date(b).getTime();

const sameList = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((value, index) => value === b[index]);

const loadExistingProperties = async (admin: Admin): Promise<Map<string, ExistingProperty>> => {
  const out = new Map<string, ExistingProperty>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from("properties")
      .select("id, external_id, slug, status, source_updated_at, published_at, agent_id, locality, district, street, house, lat, lng")
      .eq("source", "plektan")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) return fail("loading properties", error);
    for (const row of data) if (row.external_id !== null) out.set(row.external_id, row);
    if (data.length < PAGE) return out;
  }
};

// ---- coordinates ---------------------------------------------------------------

type Address = { locality: string | null; district: string | null; street: string | null; house: string | null };

type CoordsOutcome = {
  /** Columns to write, or null when lat/lng stay as they are. */
  patch: { lat: number | null; lng: number | null } | null;
  /** The lookup failed for a reason that may pass (network, 5xx, rate limit): the row is revisited next run. */
  transient: boolean;
};

const sameAddress = (a: Address, b: Address): boolean =>
  a.locality === b.locality && a.district === b.district && a.street === b.street && a.house === b.house;

/**
 * Geocodes only when the address differs from the stored one or the stored coordinates are empty.
 * Never throws: a failure leaves the coordinates empty (or clears old ones when the address moved).
 * A "not found" is final until the address changes or Plektan modifies the property again.
 */
const resolveCoords = async (
  address: Address,
  stored: (Address & { lat: number | null; lng: number | null }) | null,
  stats: GeocodeStats,
  label: string,
  log: (message: string) => void,
): Promise<CoordsOutcome> => {
  const changed = stored === null || !sameAddress(address, stored);
  const missing = stored === null || stored.lat === null || stored.lng === null;
  if (!changed && !missing) return { patch: null, transient: false };

  // Old coordinates belong to the old address: when it moved and nothing is found, they are cleared.
  const clear = changed && stored !== null && (stored.lat !== null || stored.lng !== null);
  const miss = { lat: null, lng: null };
  if (address.locality === null) return { patch: clear ? miss : null, transient: false };

  stats.calls += 1;
  try {
    const found = await geocode(address);
    if (found === null) {
      stats.failed += 1;
      return { patch: clear ? miss : null, transient: false };
    }
    stats.found += 1;
    if (stored !== null && stored.lat === found.lat && stored.lng === found.lng) return { patch: null, transient: false };
    return { patch: { lat: found.lat, lng: found.lng }, transient: false };
  } catch (error) {
    stats.failed += 1;
    log(`sync: geocoding item ${label} failed: ${isGeocodeError(error) ? error.kind : "unknown error"}`);
    return { patch: clear ? miss : null, transient: true };
  }
};

// ---- agents ------------------------------------------------------------------

type AgentsOutcome = {
  idByExternalId: Map<string, string>;
  added: number;
  updated: number;
  deactivated: number;
};

const syncAgents = async (admin: Admin, persons: PlektanContactPerson[]): Promise<AgentsOutcome> => {
  const { data, error } = await admin
    .from("agents")
    .select("id, external_id, name, phones, email, is_active")
    .eq("source", "plektan");
  if (error) return fail("loading agents", error);
  const existing = new Map<string, ExistingAgent>();
  for (const row of data) if (row.external_id !== null) existing.set(row.external_id, row);

  const idByExternalId = new Map<string, string>();
  let added = 0;
  let updated = 0;
  const seen = new Set<string>();

  for (const person of persons) {
    seen.add(person.user_id);
    const name = person.name?.trim() || "Без імені";
    const email = person.email?.trim() || null;
    const current = existing.get(person.user_id);

    if (current === undefined) {
      const insert: TablesInsert<"agents"> = {
        source: "plektan",
        external_id: person.user_id,
        name,
        phones: person.phones,
        email,
        is_active: true,
      };
      const { data: created, error: insertError } = await admin.from("agents").insert(insert).select("id").single();
      if (insertError) return fail("inserting an agent", insertError);
      idByExternalId.set(person.user_id, created.id);
      added += 1;
      continue;
    }

    idByExternalId.set(person.user_id, current.id);
    const changed =
      current.name !== name ||
      !sameList(current.phones, person.phones) ||
      current.email !== email ||
      !current.is_active;
    if (!changed) continue;
    // photo_url is left as is: photos are copied by the photo step.
    const { error: updateError } = await admin
      .from("agents")
      .update({ name, phones: person.phones, email, is_active: true })
      .eq("id", current.id);
    if (updateError) return fail("updating an agent", updateError);
    updated += 1;
  }

  const gone = [...existing.values()].filter((agent) => agent.is_active && !seen.has(agent.external_id ?? ""));
  for (const group of chunks(gone, CHUNK)) {
    const { error: offError } = await admin
      .from("agents")
      .update({ is_active: false })
      .in("id", group.map((agent) => agent.id));
    if (offError) return fail("deactivating agents", offError);
  }

  return { idByExternalId, added, updated, deactivated: gone.length };
};

// ---- search ------------------------------------------------------------------

const optionalEnv = (name: string): string | undefined => {
  const value = process.env[name]?.trim();
  return value === undefined || value === "" ? undefined : value;
};

const searchEverything = async (afterDate: string | null): Promise<Map<string, PlektanListItem>> => {
  const geo = {
    geo_search_by: "region" as const,
    country_id: optionalEnv("PLEKTAN_COUNTRY_ID"),
    region_id: optionalEnv("PLEKTAN_REGION_ID"),
    locality_id: optionalEnv("PLEKTAN_LOCALITY_ID"),
  };
  const items = new Map<string, PlektanListItem>();
  for (const deal of DEALS) {
    for (const property of PROPERTY_TYPES) {
      const params: Omit<PlektanSearchParams, "currentPage"> = {
        deal,
        property,
        prop_kind: PROP_KINDS_BY_PROPERTY[property],
        ...(geo.country_id === undefined ? {} : { country_id: geo.country_id }),
        ...(geo.region_id === undefined ? {} : { region_id: geo.region_id }),
        ...(geo.locality_id === undefined ? {} : { locality_id: geo.locality_id }),
        geo_search_by: geo.geo_search_by,
        ...(afterDate === null ? {} : { after_date: afterDate }),
      };
      const page = await searchAll(params);
      for (const item of page.items) items.set(item.adid, item);
    }
  }
  return items;
};

// ---- the run -----------------------------------------------------------------

const insertWithSlug = async (
  admin: Admin,
  base: Omit<PropertyInsert, "slug">,
  title: string,
): Promise<{ id: string; slug: string }> => {
  for (let attempt = 0; ; attempt += 1) {
    const slug = createSlug(title);
    const { data, error } = await admin.from("properties").insert({ ...base, slug }).select("id, slug").single();
    if (!error) return data;
    // A taken slug is retried once with a new suffix; anything else is a real error.
    if (error.code !== UNIQUE_VIOLATION || attempt >= 1) return fail("inserting a property", error);
  }
};

export const runSync = async (options: RunSyncOptions): Promise<SyncResult> => {
  const log = options.log ?? ((message: string) => console.log(message));
  const now = options.now ?? (() => new Date());
  const runStart = now();

  const settings = await getSettings();
  if (settings.properties_source !== "plektan") {
    log(`sync skipped: properties_source is "${settings.properties_source}"`);
    return { status: "skipped", reason: `properties_source is ${settings.properties_source}` };
  }

  const admin = createAdminClient();
  const rates: ExchangeRates = settings.exchange_rates;
  const warnings: string[] = [];
  const geoStats: GeocodeStats = { calls: 0, found: 0, failed: 0 };
  resetGeocoder();
  const mode: SyncMode = options.mode === "incremental" && settings.sync_cursor !== null ? "incremental" : "full";
  if (options.mode === "incremental" && mode === "full") log("sync: no cursor yet, running as full");

  // Everything is read before the first property write, so a failing search leaves the data untouched.
  const persons = await getContactPersons();
  const items = await searchEverything(mode === "incremental" ? settings.sync_cursor : null);
  log(`sync (${mode}): Plektan returned ${items.size} items`);

  const agents = await syncAgents(admin, persons);
  const photoStats = createPhotoStats();
  const agentPhotosChanged = await syncAgentPhotos(
    admin,
    persons.flatMap((person) => {
      const id = agents.idByExternalId.get(person.user_id);
      return id === undefined ? [] : [{ id, url: person.url_small }];
    }),
    photoStats,
    log,
  );
  const existing = await loadExistingProperties(admin);
  const publishedBefore = [...existing.values()].filter((row) => row.status === "published").length;

  const nowIso = runStart.toISOString();
  const changedSlugs = new Set<string>();
  const hiddenIds = new Set<string>();
  const handled = new Set<string>();
  let added = 0;
  let updated = 0;
  let hidden = 0;
  let unchanged = 0;
  let skipped = 0;
  let failed = 0;

  const hideRows = async (rows: ExistingProperty[]): Promise<void> => {
    for (const group of chunks(rows, CHUNK)) {
      const { error } = await admin
        .from("properties")
        .update({ status: "hidden" })
        .in("id", group.map((row) => row.id));
      if (error) return fail("hiding properties", error);
      for (const row of group) {
        changedSlugs.add(row.slug);
        hiddenIds.add(row.id);
      }
    }
    hidden += rows.length;
  };

  for (const item of items.values()) {
    const current = existing.get(item.adid);
    handled.add(item.adid);
    try {
      if (item.is_mls || item.state !== "actual") {
        skipped += 1;
        if (current !== undefined && current.status === "published") await hideRows([current]);
        continue;
      }

      // Same modification time as the last write and still published: nothing to fetch or write.
      if (
        current !== undefined &&
        current.status === "published" &&
        sameInstant(current.source_updated_at, parseKyivDateTime(item.date_mod))
      ) {
        unchanged += 1;
        continue;
      }

      const card = await view({ adid: item.adid });
      const mapped = mapProperty(item, card, rates);
      if (mapped.kind === "skip") {
        skipped += 1;
        if (current !== undefined && current.status === "published") await hideRows([current]);
        continue;
      }

      const agentId =
        mapped.agentExternalId === null ? null : (agents.idByExternalId.get(mapped.agentExternalId) ?? null);

      const photoSources = card.media.map((media) => media.src);

      const address: Address = {
        locality: mapped.row.locality ?? null,
        district: mapped.row.district ?? null,
        street: mapped.row.street ?? null,
        house: mapped.row.house ?? null,
      };
      const coords = await resolveCoords(address, current ?? null, geoStats, item.adid, log);

      if (current === undefined) {
        const created = await insertWithSlug(
          admin,
          {
            ...mapped.row,
            ...(coords.patch ?? {}),
            status: "published",
            published_at: nowIso,
            synced_at: nowIso,
            agent_id: agentId,
          },
          mapped.row.title,
        );
        added += 1;
        changedSlugs.add(created.slug);
        const photos = await syncPropertyPhotos(admin, created.id, photoSources, photoStats, log);
        if (photos.failed > 0 || coords.transient) {
          // No source_updated_at = "photos / coordinates incomplete": the next run views it again and retries.
          const { error } = await admin.from("properties").update({ source_updated_at: null }).eq("id", created.id);
          if (error) return fail("marking a property for a photo retry", error);
        }
        continue;
      }

      // Photos first, so a failure can withhold source_updated_at in the same write.
      const photos = await syncPropertyPhotos(admin, current.id, photoSources, photoStats, log);

      // Existing row: slug, published_at (when set) and seo_* are never overwritten; lat/lng only by the geocoder above.
      const patch: PropertyUpdate = {
        ...mapped.row,
        ...(coords.patch ?? {}),
        ...(photos.failed > 0 || coords.transient ? { source_updated_at: null } : {}),
        status: "published",
        synced_at: nowIso,
        ...(current.published_at === null ? { published_at: nowIso } : {}),
        ...(agentId === null ? {} : { agent_id: agentId }),
      };
      const { error } = await admin.from("properties").update(patch).eq("id", current.id);
      if (error) return fail("updating a property", error);
      updated += 1;
      changedSlugs.add(current.slug);
    } catch (error) {
      // One bad item doesn't stop the run; its adid is enough to find it (no payload in the log).
      failed += 1;
      const reason = isPlektanError(error) ? `Plektan ${error.kind}` : error instanceof Error ? error.message : "unknown error";
      log(`sync: item ${item.adid} failed: ${reason}`);
    }
  }

  // Full sync: published Plektan properties that vanished from the result get hidden.
  let hideBlocked = false;
  if (mode === "full") {
    const vanished = [...existing.values()].filter(
      (row) => row.status === "published" && row.external_id !== null && !items.has(row.external_id),
    );
    if (vanished.length > 0) {
      const remaining = publishedBefore - vanished.length;
      const suspicious = items.size === 0 || remaining * 2 < publishedBefore;
      if (suspicious && options.forceHide !== true) {
        hideBlocked = true;
        const warning = `refused to hide ${vanished.length} of ${publishedBefore} published properties (pass --force-hide to confirm)`;
        warnings.push(warning);
        log(`sync WARNING: ${warning}`);
      } else {
        await hideRows(vanished);
      }
    }
  }

  // Properties whose photos were incomplete earlier (source_updated_at null) and that this run didn't
  // revisit (an incremental run only lists recently modified items): fetch their photos (and coordinates) again.
  for (const row of existing.values()) {
    if (row.external_id === null || row.source_updated_at !== null || row.status !== "published") continue;
    if (handled.has(row.external_id) || hiddenIds.has(row.id)) continue;
    try {
      const card = await view({ adid: row.external_id });
      const photos = await syncPropertyPhotos(admin, row.id, card.media.map((media) => media.src), photoStats, log);
      if (photos.changed) changedSlugs.add(row.slug);
      const coords = await resolveCoords(row, row, geoStats, row.external_id, log);
      if (coords.patch !== null) {
        const { error } = await admin.from("properties").update(coords.patch).eq("id", row.id);
        if (error) return fail("saving coordinates", error);
        changedSlugs.add(row.slug);
      }
      if (photos.failed === 0 && !coords.transient) {
        const { error } = await admin
          .from("properties")
          .update({ source_updated_at: parseKyivDateTime(card.date_mod) })
          .eq("id", row.id);
        if (error) return fail("finishing a photo retry", error);
      }
    } catch (error) {
      // Not counted as a failed item: a property gone from Plektan would otherwise block the cursor forever.
      const reason = isPlektanError(error) ? `Plektan ${error.kind}` : error instanceof Error ? error.message : "unknown error";
      log(`sync: photo retry for item ${row.external_id} failed: ${reason}`);
    }
  }

  const agentsChanged = agents.added + agents.updated + agents.deactivated > 0 || agentPhotosChanged;
  const tags: string[] = [];
  if (changedSlugs.size > 0) tags.push(CACHE_TAGS.properties, ...[...changedSlugs].map(propertyTag));
  if (agentsChanged) tags.push(CACHE_TAGS.agents);

  if (failed > 0) {
    warnings.push(`${failed} item(s) failed; the cursor was not advanced`);
  } else {
    const { error } = await admin
      .from("settings")
      .update({ last_sync_at: now().toISOString(), sync_cursor: createSyncCursor(runStart) })
      .eq("id", true);
    if (error) return fail("writing the cursor", error);
  }

  const summary: SyncSummary = {
    mode,
    added,
    updated,
    hidden,
    unchanged,
    skipped,
    failed,
    agents: { added: agents.added, updated: agents.updated, deactivated: agents.deactivated },
    photos: photoStats,
    geocode: geoStats,
    hideBlocked,
    warnings,
  };
  return { status: "done", summary, tags };
};
