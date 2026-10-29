import { adminLeadsSearchParams } from "@/lib/db/admin-lead-filters";
import type { AdminLeadFilters } from "@/lib/db/admin-lead-filters";
import type { AdminLeadListItem } from "@/lib/db/admin-leads";

export const ADMIN_LEADS_PATH = "/admin/leads";

/** `/admin/leads?…` for the current filters with overrides (defaults dropped, page reset on filter change). */
export const leadsHref = (filters: AdminLeadFilters, overrides: Partial<AdminLeadFilters> = {}): string => {
  const query = adminLeadsSearchParams(filters, overrides).toString();
  return query ? `${ADMIN_LEADS_PATH}?${query}` : ADMIN_LEADS_PATH;
};

/**
 * `/admin/leads/<id>` carrying the list's filters (`?kind=ai&page=2`), so «До списку заявок» returns to
 * the same view. The detail page re-parses them with the filters schema (never trusts the URL).
 */
export const leadHref = (id: string, filters?: AdminLeadFilters): string => {
  const query = filters ? adminLeadsSearchParams(filters).toString() : "";
  return query ? `${ADMIN_LEADS_PATH}/${id}?${query}` : `${ADMIN_LEADS_PATH}/${id}`;
};

export const hasActiveLeadFilters = (f: AdminLeadFilters): boolean =>
  Boolean(f.kind || f.from || f.to || f.q || f.failed);

export const isLeadFailed = (lead: Pick<AdminLeadListItem, "plektan_status" | "telegram_status">): boolean =>
  lead.plektan_status === "failed" || lead.telegram_status === "failed";
