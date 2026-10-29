import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import {
  ADMIN_PROPERTIES_PAGE_SIZE,
  propertySearchOr,
  type AdminListStatus,
  type AdminPropertyFilters,
} from "./admin-property-filters";
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
