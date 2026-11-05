import "server-only";
import { z } from "zod";
import { isDemoMode } from "@/lib/data-driver";
import type { Database } from "@/lib/supabase/database.types";
import type { AdminLeadFilters } from "./admin-lead-filters";
import type { AdminLeadsDriver } from "./driver-types";

export * from "./admin-lead-filters";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

export type AdminLeadListItem = Pick<
  LeadRow,
  "id" | "kind" | "name" | "phone" | "email" | "created_at" | "plektan_status" | "telegram_status"
> & {
  property: { slug: string; title: string } | null;
};

export type AdminLeadPage = {
  items: AdminLeadListItem[];
  total: number;
  page: number;
  pageCount: number;
};

const loadDriver = async (): Promise<AdminLeadsDriver> =>
  isDemoMode()
    ? (await import("@/lib/demo/db/admin-leads")).demoAdminLeadsDriver
    : (await import("@/lib/db/supabase/admin-leads")).supabaseAdminLeadsDriver;

/**
 * Leads for the admin list, newest first. Runs with the signed-in user's session: RLS lets only
 * admins read `leads` (a non-admin gets an empty page). A page past the last returns no items
 * and the real total.
 */
export const getAdminLeads = async (filters: AdminLeadFilters): Promise<AdminLeadPage> =>
  (await loadDriver()).fetchAdminLeads(filters);

export type AdminLeadDetail = Pick<
  LeadRow,
  | "id"
  | "kind"
  | "name"
  | "phone"
  | "email"
  | "message"
  | "payload"
  | "utm"
  | "page_url"
  | "consent_at"
  | "created_at"
  | "property_id"
  | "plektan_status"
  | "plektan_error"
  | "plektan_attempts"
  | "plektan_next_attempt_at"
  | "plektan_item_id"
  | "plektan_alerted_at"
  | "telegram_status"
  | "telegram_error"
  | "telegram_attempts"
  | "telegram_next_attempt_at"
> & {
  property: {
    slug: string;
    title: string;
    external_id: string | null;
    source: Database["public"]["Enums"]["property_source"];
    status: Database["public"]["Enums"]["property_status"];
  } | null;
};

const leadIdSchema = z.uuid();

/** One lead for the admin detail page (user session, RLS guard). Invalid id or no row (or no access) → null. */
export const getAdminLead = async (id: string): Promise<AdminLeadDetail | null> => {
  const parsed = leadIdSchema.safeParse(id);
  if (!parsed.success) return null;
  return (await loadDriver()).fetchAdminLead(parsed.data);
};
