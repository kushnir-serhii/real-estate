import "server-only";
import { ADMIN_LEADS_PAGE_SIZE, kyivDayBounds, leadSearch } from "@/lib/db/admin-lead-filters";
import type { AdminLeadFilters } from "@/lib/db/admin-lead-filters";
import type { AdminLeadDetail, AdminLeadListItem } from "@/lib/db/admin-leads";
import type { AdminLeadsDriver } from "@/lib/db/driver-types";
import type { Database } from "@/lib/supabase/database.types";
import { getDemoStore } from "../store";
import { toJson } from "./json";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

/** `ilike '%x%'` with the `\` / `%` / `_` escapes `leadSearch` adds: a plain case-insensitive substring match. */
const likeToSubstring = (pattern: string): string =>
  pattern
    .slice(1, -1)
    .replace(/\\([\\%_])/g, (_match, char: string) => char)
    .toLowerCase();

/**
 * Same clauses as the SQL query. The phone search compares digits only: the seed keeps readable phones
 * («+380 00 000 00 01»), the real column holds the normalized «+380…» form.
 */
const matches = (lead: LeadRow, filters: AdminLeadFilters): boolean => {
  if (filters.kind && lead.kind !== filters.kind) return false;
  const bounds = kyivDayBounds(filters.from, filters.to);
  const createdAt = Date.parse(lead.created_at);
  if (bounds.gte && !(createdAt >= Date.parse(bounds.gte))) return false;
  if (bounds.lt && !(createdAt < Date.parse(bounds.lt))) return false;
  if (filters.failed && lead.plektan_status !== "failed" && lead.telegram_status !== "failed") return false;
  if (filters.q) {
    const search = leadSearch(filters.q);
    const needle = likeToSubstring(search.pattern);
    const haystack = search.column === "phone" ? lead.phone.replace(/\D/g, "") : lead.name.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
};

/** ORDER BY created_at DESC, id DESC. */
const newestFirst = (a: LeadRow, b: LeadRow): number => {
  const byTime = Date.parse(b.created_at) - Date.parse(a.created_at);
  if (byTime !== 0) return byTime;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
};

const fetchAdminLeads: AdminLeadsDriver["fetchAdminLeads"] = async (filters) => {
  const store = getDemoStore();
  const found = store.leads.filter((lead) => matches(lead, filters)).sort(newestFirst);
  const total = found.length;
  const offset = (filters.page - 1) * ADMIN_LEADS_PAGE_SIZE;
  const items = found.slice(offset, offset + ADMIN_LEADS_PAGE_SIZE).map((lead): AdminLeadListItem => {
    const property = lead.property_id ? store.properties.find((row) => row.id === lead.property_id) : undefined;
    return {
      id: lead.id,
      kind: lead.kind,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      created_at: lead.created_at,
      plektan_status: lead.plektan_status,
      telegram_status: lead.telegram_status,
      property: property ? { slug: property.slug, title: property.title } : null,
    };
  });
  return { items, total, page: filters.page, pageCount: Math.max(1, Math.ceil(total / ADMIN_LEADS_PAGE_SIZE)) };
};

const fetchAdminLead: AdminLeadsDriver["fetchAdminLead"] = async (id) => {
  const store = getDemoStore();
  const lead = store.leads.find((row) => row.id === id);
  if (!lead) return null;
  const property = lead.property_id ? store.properties.find((row) => row.id === lead.property_id) : undefined;
  const detail: AdminLeadDetail = {
    id: lead.id,
    kind: lead.kind,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    message: lead.message,
    payload: toJson(lead.payload),
    utm: toJson(lead.utm),
    page_url: lead.page_url,
    consent_at: lead.consent_at,
    created_at: lead.created_at,
    property_id: lead.property_id,
    plektan_status: lead.plektan_status,
    plektan_error: lead.plektan_error,
    plektan_attempts: lead.plektan_attempts,
    plektan_next_attempt_at: lead.plektan_next_attempt_at,
    plektan_item_id: lead.plektan_item_id,
    plektan_alerted_at: lead.plektan_alerted_at,
    telegram_status: lead.telegram_status,
    telegram_error: lead.telegram_error,
    telegram_attempts: lead.telegram_attempts,
    telegram_next_attempt_at: lead.telegram_next_attempt_at,
    property: property
      ? {
          slug: property.slug,
          title: property.title,
          external_id: property.external_id,
          source: property.source,
          status: property.status,
        }
      : null,
  };
  return detail;
};

export const demoAdminLeadsDriver: AdminLeadsDriver = { fetchAdminLeads, fetchAdminLead };
