import "server-only";
import type { LeadsDriver } from "@/lib/db/driver-types";
import type { LeadForDelivery } from "@/lib/db/leads";
import type { Database } from "@/lib/supabase/database.types";
import { getDemoStore } from "../store";
import { toJson } from "./json";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

/** Mirrors the unique `client_request_id`, the `property_id` foreign key and the column defaults (leads migrations). */
const insertLead: LeadsDriver["insertLead"] = async (lead) => {
  const store = getDemoStore();
  const existing = store.leads.find((row) => row.client_request_id === lead.client_request_id);
  if (existing) return { id: existing.id, created: false };
  if (lead.property_id && !store.properties.some((property) => property.id === lead.property_id)) {
    throw new Error("createLead failed: property_id violates foreign key constraint");
  }
  const now = new Date().toISOString();
  const row: LeadRow = {
    id: crypto.randomUUID(),
    kind: lead.kind,
    property_id: lead.property_id ?? null,
    name: lead.name,
    phone: lead.phone,
    email: lead.email ?? null,
    message: lead.message ?? null,
    payload: toJson(lead.payload),
    consent_at: lead.consent_at,
    client_request_id: lead.client_request_id,
    page_url: lead.page_url ?? null,
    utm: toJson(lead.utm),
    plektan_status: "pending",
    plektan_error: null,
    plektan_attempts: 0,
    plektan_item_id: null,
    plektan_next_attempt_at: null,
    plektan_alerted_at: null,
    telegram_status: "pending",
    telegram_error: null,
    telegram_attempts: 0,
    telegram_next_attempt_at: null,
    created_at: now,
    updated_at: now,
  };
  store.leads.push(row);
  return { id: row.id, created: true };
};

/** Service role: sees every property, as the embedded select does. */
const fetchLeadForDelivery: LeadsDriver["fetchLeadForDelivery"] = async (id): Promise<LeadForDelivery | null> => {
  const store = getDemoStore();
  const lead = store.leads.find((row) => row.id === id);
  if (!lead) return null;
  const property = lead.property_id ? store.properties.find((row) => row.id === lead.property_id) : undefined;
  return {
    id: lead.id,
    kind: lead.kind,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    message: lead.message,
    payload: toJson(lead.payload),
    page_url: lead.page_url,
    plektan_status: lead.plektan_status,
    plektan_attempts: lead.plektan_attempts,
    telegram_status: lead.telegram_status,
    telegram_attempts: lead.telegram_attempts,
    property: property
      ? {
          slug: property.slug,
          title: property.title,
          source: property.source,
          external_id: property.external_id,
          deal: property.deal,
          property_type: property.property_type,
          prop_kind: property.prop_kind,
        }
      : null,
  };
};

/** Like the SQL update: an unknown id changes nothing; the `set_updated_at` trigger bumps `updated_at`. */
const updateLeadDelivery: LeadsDriver["updateLeadDelivery"] = async (id, update) => {
  const lead = getDemoStore().leads.find((row) => row.id === id);
  if (!lead) return;
  if (update.channel === "plektan") {
    lead.plektan_status = update.status;
    lead.plektan_error = update.error;
    lead.plektan_attempts = update.attempts;
    lead.plektan_next_attempt_at = update.nextAttemptAt;
    if (update.itemId !== undefined) lead.plektan_item_id = update.itemId;
  } else {
    lead.telegram_status = update.status;
    lead.telegram_error = update.error;
    lead.telegram_attempts = update.attempts;
    lead.telegram_next_attempt_at = update.nextAttemptAt;
  }
  lead.updated_at = new Date().toISOString();
};

/** A null timestamp never satisfies a comparison (SQL three-valued logic). */
const reached = (iso: string | null, bound: number, strict: boolean): boolean => {
  if (iso === null) return false;
  const at = Date.parse(iso);
  return strict ? at < bound : at <= bound;
};

const byCreatedAt = (a: LeadRow, b: LeadRow): number => Date.parse(a.created_at) - Date.parse(b.created_at);

/** The four OR branches of the SQL filter, oldest first. */
const fetchDueLeadIds: LeadsDriver["fetchDueLeadIds"] = async ({ now, staleBefore, maxAttempts, limit }) =>
  getDemoStore()
    .leads.filter(
      (lead) =>
        (lead.plektan_status === "failed" &&
          lead.plektan_attempts < maxAttempts &&
          reached(lead.plektan_next_attempt_at, now.getTime(), false)) ||
        (lead.telegram_status === "failed" &&
          lead.telegram_attempts < maxAttempts &&
          reached(lead.telegram_next_attempt_at, now.getTime(), false)) ||
        (lead.plektan_status === "pending" && reached(lead.created_at, staleBefore.getTime(), true)) ||
        (lead.telegram_status === "pending" && reached(lead.created_at, staleBefore.getTime(), true)),
    )
    .sort(byCreatedAt)
    .slice(0, limit)
    .map((lead) => lead.id);

const fetchLeadsToAlert: LeadsDriver["fetchLeadsToAlert"] = async ({ maxAttempts, limit }) =>
  getDemoStore()
    .leads.filter(
      (lead) =>
        lead.plektan_status === "failed" && lead.plektan_attempts >= maxAttempts && lead.plektan_alerted_at === null,
    )
    .sort(byCreatedAt)
    .slice(0, limit)
    .map(({ id, name, phone }) => ({ id, name, phone }));

const markPlektanAlerted: LeadsDriver["markPlektanAlerted"] = async (id, at) => {
  const lead = getDemoStore().leads.find((row) => row.id === id);
  if (!lead) return;
  lead.plektan_alerted_at = at.toISOString();
  lead.updated_at = new Date().toISOString();
};

const isPropertyPublished: LeadsDriver["isPropertyPublished"] = async (id) =>
  getDemoStore().properties.some((row) => row.id === id && row.status === "published");

const fetchPropertyBrief: LeadsDriver["fetchPropertyBrief"] = async (id) => {
  const row = getDemoStore().properties.find((property) => property.id === id);
  return row ? { id: row.id, slug: row.slug, title: row.title } : null;
};

export const demoLeadsDriver: LeadsDriver = {
  insertLead,
  fetchLeadForDelivery,
  updateLeadDelivery,
  fetchDueLeadIds,
  fetchLeadsToAlert,
  markPlektanAlerted,
  isPropertyPublished,
  fetchPropertyBrief,
};
