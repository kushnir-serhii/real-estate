import "server-only";
import type { PropertySeoValues } from "@/features/admin/properties/property-form-schema";
import { photoObjectKeys } from "@/lib/photos/photo-keys";
import { deleteObjects } from "@/lib/r2";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  ADMIN_PROPERTIES_PAGE_SIZE,
  propertySearchOr,
  toListStatus,
  type AdminPropertyFilters,
} from "../admin-property-filters";
import type {
  AdminProperty,
  AdminPropertyAgent,
  AdminPropertyListItem,
  AdminPropertyPage,
  AdminPropertyPhoto,
  DeleteAdminDraftResult,
  PropertySlugResult,
  SourceSwitchCounts,
} from "../admin-properties";
import type { AdminPropertiesDriver } from "../driver-types";
import type { ExchangeRates } from "../settings";
import type { PropertiesMode } from "../property-permissions";

type ListRow = Omit<AdminPropertyListItem, "listStatus" | "cover"> & {
  property_photos: NonNullable<AdminPropertyListItem["cover"]>[];
};

/** `raw` and `house` are not granted to authenticated: never select them. */
const LIST_SELECT =
  "id,slug,title,status,source,external_id,deal,property_type,price_amount,currency,locality,district,street,published_at,hidden_at,updated_at,property_photos(r2_key,sizes,width,height)";

const fetchAdminProperties = async (filters: AdminPropertyFilters): Promise<AdminPropertyPage> => {
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
    const firstPage = await fetchAdminProperties({ ...filters, page: 1 });
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

const fetchSourceSwitchCounts = async (): Promise<SourceSwitchCounts> => {
  const supabase = await createClient();
  const count = async (source: "plektan" | "admin", published: boolean): Promise<number> => {
    let query = supabase.from("properties").select("id", { count: "exact", head: true }).eq("source", source);
    if (published) query = query.eq("status", "published");
    const { count: total, error } = await query;
    if (error) throw new Error(`getSourceSwitchSummary failed: ${error.message}`);
    return total ?? 0;
  };

  const [plektanTotal, plektanPublished, adminTotal, adminPublished] = await Promise.all([
    count("plektan", false),
    count("plektan", true),
    count("admin", false),
    count("admin", true),
  ]);

  return {
    plektan: { total: plektanTotal, published: plektanPublished },
    admin: { total: adminTotal, published: adminPublished },
  };
};

const setPropertiesSource = async (mode: PropertiesMode): Promise<void> => {
  const { error } = await createAdminClient()
    .from("settings")
    .update({ properties_source: mode })
    .not("id", "is", null);
  if (error) throw new Error(`setPropertiesSource failed: ${error.message}`);
};

const saveExchangeRates = async (rates: ExchangeRates): Promise<{ recomputed: number }> => {
  const { data, error } = await createAdminClient().rpc("save_exchange_rates", {
    p_uah: rates.UAH,
    p_eur: rates.EUR,
  });
  if (error) throw new Error(`save_exchange_rates failed: ${error.message}`);
  return { recomputed: data ?? 0 };
};

const PROPERTY_COLUMNS =
  "id,source,external_id,status,deal,property_type,prop_kind,price_amount,currency,price_usd,price_per_m2,area_total,area_life,area_kitchen,area_lot,room_count,storey,storeys,repair,wall_material,housing_class,is_newbuilding,locality,district,street,house,lat,lng,title,description,slug,seo_title,seo_description,agent_id,source_updated_at,synced_at,published_at,hidden_at,created_at,updated_at";

const ONE_SELECT = `${PROPERTY_COLUMNS},property_photos(id,position,r2_key,sizes,width,height),agents(id,name,is_active)`;

type OneRow = Omit<AdminProperty, "photos" | "agent"> & {
  property_photos: AdminPropertyPhoto[];
  agents: AdminPropertyAgent | null;
};

const fetchAdminProperty = async (id: string): Promise<AdminProperty | null> => {
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

const fetchActiveAgentOptions: AdminPropertiesDriver["fetchActiveAgentOptions"] = async () => {
  const { data, error } = await createAdminClient()
    .from("agents")
    .select("id,name")
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error(`getActiveAgents failed: ${error.message}`);
  return data;
};

const UNIQUE_VIOLATION = "23505";

const agentExists = async (agentId: string): Promise<boolean> => {
  const { data, error } = await createAdminClient().from("agents").select("id").eq("id", agentId).maybeSingle();
  if (error) throw new Error(`agent lookup failed: ${error.message}`);
  return data !== null;
};

const insertProperty: AdminPropertiesDriver["insertProperty"] = async (columns, slug) => {
  const { data, error } = await createAdminClient()
    .from("properties")
    .insert({ ...columns, source: "admin", status: "hidden", slug })
    .select("id,slug")
    .single();
  if (!error) return { ok: true, id: data.id, slug: data.slug };
  if (error.code === UNIQUE_VIOLATION) return { ok: false, reason: "slug_taken" };
  throw new Error(`createAdminProperty failed: ${error.message}`);
};

const updateProperty: AdminPropertiesDriver["updateProperty"] = async (id, columns, slug) => {
  const { data, error } = await createAdminClient()
    .from("properties")
    .update({ ...columns, slug })
    .eq("id", id)
    .select("slug")
    .maybeSingle();
  if (!error) return data === null ? { ok: false, reason: "not_found" } : { ok: true, slug: data.slug };
  if (error.code === UNIQUE_VIOLATION) return { ok: false, reason: "slug_taken" };
  throw new Error(`updateAdminProperty failed: ${error.message}`);
};

const updatePropertySeo = async (id: string, seo: PropertySeoValues): Promise<PropertySlugResult> => {
  const { data, error } = await createAdminClient()
    .from("properties")
    .update({ seo_title: seo.seo_title, seo_description: seo.seo_description })
    .eq("id", id)
    .select("slug")
    .maybeSingle();
  if (error) throw new Error(`updateAdminPropertySeo failed: ${error.message}`);
  return data === null ? { ok: false, reason: "not_found" } : { ok: true, slug: data.slug };
};

const fetchPublishFields: AdminPropertiesDriver["fetchPublishFields"] = async (id) => {
  const { data, error } = await createAdminClient()
    .from("properties")
    .select("slug,title,deal,property_type,locality,published_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`publishAdminProperty failed: ${error.message}`);
  return data;
};

const setPublished = async (id: string, publishedAt: string): Promise<void> => {
  const { error } = await createAdminClient()
    .from("properties")
    .update({ status: "published", published_at: publishedAt })
    .eq("id", id);
  if (error) throw new Error(`publishAdminProperty failed: ${error.message}`);
};

const hideProperty = async (id: string): Promise<PropertySlugResult> => {
  const { data, error } = await createAdminClient()
    .from("properties")
    .update({ status: "hidden" })
    .eq("id", id)
    .select("slug")
    .maybeSingle();
  if (error) throw new Error(`hideAdminProperty failed: ${error.message}`);
  return data === null ? { ok: false, reason: "not_found" } : { ok: true, slug: data.slug };
};

const deleteDraft = async (id: string): Promise<DeleteAdminDraftResult> => {
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

export const supabaseAdminPropertiesDriver: AdminPropertiesDriver = {
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
