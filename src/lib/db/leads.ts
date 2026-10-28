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
