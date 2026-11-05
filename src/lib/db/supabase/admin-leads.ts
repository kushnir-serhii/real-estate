import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  ADMIN_LEADS_PAGE_SIZE,
  kyivDayBounds,
  leadSearch,
  type AdminLeadFilters,
} from "../admin-lead-filters";
import type { AdminLeadDetail, AdminLeadListItem, AdminLeadPage } from "../admin-leads";
import type { AdminLeadsDriver } from "../driver-types";

const LIST_SELECT = "id,kind,name,phone,email,created_at,plektan_status,telegram_status,property:properties(slug,title)";

/**
 * Leads for the admin list, newest first. Runs with the signed-in user's session: RLS lets only
 * admins read `leads` (a non-admin gets an empty page). A page past the last returns no items
 * and the real total.
 */
const fetchAdminLeads = async (filters: AdminLeadFilters): Promise<AdminLeadPage> => {
  const supabase = await createClient();
  const offset = (filters.page - 1) * ADMIN_LEADS_PAGE_SIZE;

  let query = supabase.from("leads").select(LIST_SELECT, { count: "exact" });
  if (filters.kind) query = query.eq("kind", filters.kind);
  const bounds = kyivDayBounds(filters.from, filters.to);
  if (bounds.gte) query = query.gte("created_at", bounds.gte);
  if (bounds.lt) query = query.lt("created_at", bounds.lt);
  if (filters.failed) query = query.or("plektan_status.eq.failed,telegram_status.eq.failed");
  if (filters.q) {
    const search = leadSearch(filters.q);
    query = query.ilike(search.column, search.pattern);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + ADMIN_LEADS_PAGE_SIZE - 1)
    .overrideTypes<AdminLeadListItem[], { merge: false }>();

  // PGRST103: the page starts past the last row. Empty page + the real total.
  if (error?.code === "PGRST103" && filters.page > 1) {
    const firstPage = await fetchAdminLeads({ ...filters, page: 1 });
    return { ...firstPage, items: [], page: filters.page };
  }
  if (error) throw new Error(`getAdminLeads failed: ${error.message}`);

  const total = count ?? 0;
  return {
    items: data,
    total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_LEADS_PAGE_SIZE)),
  };
};

const DETAIL_SELECT =
  "id,kind,name,phone,email,message,payload,utm,page_url,consent_at,created_at,property_id,plektan_status,plektan_error,plektan_attempts,plektan_next_attempt_at,plektan_item_id,plektan_alerted_at,telegram_status,telegram_error,telegram_attempts,telegram_next_attempt_at,property:properties(slug,title,external_id,source,status)";

const fetchAdminLead = async (id: string): Promise<AdminLeadDetail | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<AdminLeadDetail, { merge: false }>();
  if (error) throw new Error(`getAdminLead failed: ${error.message}`);
  return data;
};

export const supabaseAdminLeadsDriver: AdminLeadsDriver = { fetchAdminLeads, fetchAdminLead };
