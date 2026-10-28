import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];
type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];

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
export type CreateLeadResult = { id: string; created: boolean };

/**
 * Saves a lead (service role). Idempotent on `client_request_id`: a repeat call returns the
 * existing lead with `created: false`. Never logs personal data.
 */
export const createLead = async (input: CreateLeadInput): Promise<CreateLeadResult> => {
  const lead = createLeadSchema.parse(input);
  const supabase = createAdminClient();
  const row: LeadInsert = {
    ...lead,
    // zod's `Record<string, unknown>` is JSON-serializable here but not assignable to the generated `Json` type.
    payload: lead.payload as LeadInsert["payload"],
    utm: lead.utm as LeadInsert["utm"],
  };

  const { data: inserted, error } = await supabase
    .from("leads")
    .upsert(row, { onConflict: "client_request_id", ignoreDuplicates: true })
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`createLead failed: ${error.message}`);
  if (inserted) return { id: inserted.id, created: true };

  // Duplicate request: ignoreDuplicates returns no row, so read the existing one.
  const { data: existing, error: readError } = await supabase
    .from("leads")
    .select("id")
    .eq("client_request_id", lead.client_request_id)
    .single();
  if (readError) throw new Error(`createLead failed: ${readError.message}`);
  return { id: existing.id, created: false };
};

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
export const getLeadForDelivery = async (id: string): Promise<LeadForDelivery | null> => {
  const { data, error } = await createAdminClient()
    .from("leads")
    .select(
      `id,kind,name,phone,email,message,payload,page_url,plektan_status,plektan_attempts,telegram_status,telegram_attempts,
      property:properties(slug,title,source,external_id,deal,property_type,prop_kind)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getLeadForDelivery failed: ${error.message}`);
  return data;
};

export type LeadDeliveryUpdate =
  | {
      channel: "plektan";
      status: DeliveryStatus;
      error: string | null;
      attempts: number;
      /** Only set on success; omitted keeps the stored value. */
      itemId?: string | null;
    }
  | { channel: "telegram"; status: DeliveryStatus; error: string | null; attempts: number };

/** Writes one channel's result. `error` must hold no personal data. */
export const updateLeadDelivery = async (id: string, update: LeadDeliveryUpdate): Promise<void> => {
  const patch: Database["public"]["Tables"]["leads"]["Update"] =
    update.channel === "plektan"
      ? {
          plektan_status: update.status,
          plektan_error: update.error,
          plektan_attempts: update.attempts,
          ...(update.itemId === undefined ? {} : { plektan_item_id: update.itemId }),
        }
      : { telegram_status: update.status, telegram_error: update.error, telegram_attempts: update.attempts };
  const { error } = await createAdminClient().from("leads").update(patch).eq("id", id);
  if (error) throw new Error(`updateLeadDelivery failed: ${error.message}`);
};
