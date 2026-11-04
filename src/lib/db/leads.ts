import "server-only";
import { z } from "zod";
import type { LeadsDriver } from "./driver-types";
import { isDemoMode } from "@/lib/data-driver";
import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];

export const LEAD_KINDS = ["property_request", "general", "ai"] as const satisfies readonly Enums["lead_kind"][];
export const DELIVERY_STATUSES = [
  "pending",
  "sent",
  "failed",
  "skipped",
] as const satisfies readonly Enums["delivery_status"][];

const text = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), text(max).optional());

const jsonObject = z.record(z.string(), z.unknown());

/** Basic shape only; full phone validation (UA mask) belongs to the form layer (spec 006). */
export const createLeadSchema = z.object({
  kind: z.enum(LEAD_KINDS),
  property_id: z.uuid().optional(),
  name: text(200).min(1),
  phone: text(32).min(5),
  email: optionalText(254),
  message: optionalText(5000),
  payload: jsonObject.optional(),
  consent_at: z.iso.datetime({ offset: true }),
  client_request_id: z.uuid(),
  page_url: optionalText(2048),
  utm: jsonObject.optional(),
});

export type CreateLeadInput = z.input<typeof createLeadSchema>;
export type ParsedLead = z.output<typeof createLeadSchema>;
export type CreateLeadResult = { id: string; created: boolean };

/** The driver is picked per call (env is read lazily) and loaded on demand, so the other one never enters the request. */
const loadDriver = async (): Promise<LeadsDriver> =>
  isDemoMode()
    ? (await import("@/lib/demo/db/leads")).demoLeadsDriver
    : (await import("@/lib/db/supabase/leads")).supabaseLeadsDriver;

/**
 * Saves a lead (service role). Idempotent on `client_request_id`: a repeat call returns the
 * existing lead with `created: false`. Never logs personal data.
 */
export const createLead = async (input: CreateLeadInput): Promise<CreateLeadResult> =>
  (await loadDriver()).insertLead(createLeadSchema.parse(input));

type DeliveryStatus = Enums["delivery_status"];

/** A lead with the property data delivery needs (Plektan mapping, Telegram text). */
export type LeadForDelivery = {
  id: string;
  kind: Enums["lead_kind"];
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  payload: unknown;
  page_url: string | null;
  plektan_status: DeliveryStatus;
  plektan_attempts: number;
  telegram_status: DeliveryStatus;
  telegram_attempts: number;
  property: {
    slug: string;
    title: string;
    source: Enums["property_source"];
    external_id: string | null;
    deal: Enums["deal"];
    property_type: Enums["property_type"];
    prop_kind: string | null;
  } | null;
};

/** Service role. Returns null when the lead doesn't exist. */
export const getLeadForDelivery = async (id: string): Promise<LeadForDelivery | null> =>
  (await loadDriver()).fetchLeadForDelivery(id);

export type LeadDeliveryUpdate =
  | {
      channel: "plektan";
      status: DeliveryStatus;
      error: string | null;
      attempts: number;
      /** Only set on success; omitted keeps the stored value. */
      itemId?: string | null;
      /** When the next retry is due; null = none (sent, skipped, or out of attempts). */
      nextAttemptAt: string | null;
    }
  | {
      channel: "telegram";
      status: DeliveryStatus;
      error: string | null;
      attempts: number;
      nextAttemptAt: string | null;
    };

/** Writes one channel's result. `error` must hold no personal data. */
export const updateLeadDelivery = async (id: string, update: LeadDeliveryUpdate): Promise<void> =>
  (await loadDriver()).updateLeadDelivery(id, update);

/**
 * Leads that cron should deliver now (oldest first): a channel `failed` with attempts left and its
 * retry time reached, or still `pending` after `staleBefore` (the first delivery was lost).
 * Fresher pending leads are left to the in-flight first delivery.
 */
export const getDueLeadIds = async (params: {
  now: Date;
  staleBefore: Date;
  maxAttempts: number;
  limit: number;
}): Promise<string[]> => (await loadDriver()).fetchDueLeadIds(params);

/** A lead whose Plektan delivery ran out of attempts and hasn't been reported to the manager yet. */
export type LeadToAlert = Pick<LeadForDelivery, "id" | "name" | "phone">;

export const getLeadsToAlert = async (params: { maxAttempts: number; limit: number }): Promise<LeadToAlert[]> =>
  (await loadDriver()).fetchLeadsToAlert(params);

export const markPlektanAlerted = async (id: string, at: Date): Promise<void> =>
  (await loadDriver()).markPlektanAlerted(id, at);

/** True only for a published property: a lead's `property_id` from the client is never taken on trust. */
export const isPropertyPublished = async (id: string): Promise<boolean> =>
  (await loadDriver()).isPropertyPublished(id);

/** Any property (sold / hidden too) the visitor asked to find something similar to. */
export type PropertyBrief = { id: string; slug: string; title: string };

export const getPropertyBrief = async (id: string): Promise<PropertyBrief | null> =>
  (await loadDriver()).fetchPropertyBrief(id);
