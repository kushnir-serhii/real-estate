import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import type { LeadsDriver } from "../driver-types";
import type { CreateLeadResult, LeadForDelivery, LeadToAlert, ParsedLead } from "../leads";

type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];

const insertLead = async (lead: ParsedLead): Promise<CreateLeadResult> => {
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

const fetchLeadForDelivery = async (id: string): Promise<LeadForDelivery | null> => {
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

const updateLeadDelivery: LeadsDriver["updateLeadDelivery"] = async (id, update) => {
  const patch: Database["public"]["Tables"]["leads"]["Update"] =
    update.channel === "plektan"
      ? {
          plektan_status: update.status,
          plektan_error: update.error,
          plektan_attempts: update.attempts,
          plektan_next_attempt_at: update.nextAttemptAt,
          ...(update.itemId === undefined ? {} : { plektan_item_id: update.itemId }),
        }
      : {
          telegram_status: update.status,
          telegram_error: update.error,
          telegram_attempts: update.attempts,
          telegram_next_attempt_at: update.nextAttemptAt,
        };
  const { error } = await createAdminClient().from("leads").update(patch).eq("id", id);
  if (error) throw new Error(`updateLeadDelivery failed: ${error.message}`);
};

const fetchDueLeadIds: LeadsDriver["fetchDueLeadIds"] = async (params) => {
  const now = params.now.toISOString();
  const stale = params.staleBefore.toISOString();
  const max = params.maxAttempts;
  const { data, error } = await createAdminClient()
    .from("leads")
    .select("id")
    .or(
      [
        `and(plektan_status.eq.failed,plektan_attempts.lt.${max},plektan_next_attempt_at.lte.${now})`,
        `and(telegram_status.eq.failed,telegram_attempts.lt.${max},telegram_next_attempt_at.lte.${now})`,
        `and(plektan_status.eq.pending,created_at.lt.${stale})`,
        `and(telegram_status.eq.pending,created_at.lt.${stale})`,
      ].join(","),
    )
    .order("created_at", { ascending: true })
    .limit(params.limit);
  if (error) throw new Error(`getDueLeadIds failed: ${error.message}`);
  return data.map((row) => row.id);
};

const fetchLeadsToAlert = async (params: { maxAttempts: number; limit: number }): Promise<LeadToAlert[]> => {
  const { data, error } = await createAdminClient()
    .from("leads")
    .select("id,name,phone")
    .eq("plektan_status", "failed")
    .gte("plektan_attempts", params.maxAttempts)
    .is("plektan_alerted_at", null)
    .order("created_at", { ascending: true })
    .limit(params.limit);
  if (error) throw new Error(`getLeadsToAlert failed: ${error.message}`);
  return data;
};

const markPlektanAlerted: LeadsDriver["markPlektanAlerted"] = async (id, at) => {
  const { error } = await createAdminClient()
    .from("leads")
    .update({ plektan_alerted_at: at.toISOString() })
    .eq("id", id);
  if (error) throw new Error(`markPlektanAlerted failed: ${error.message}`);
};

const isPropertyPublished: LeadsDriver["isPropertyPublished"] = async (id) => {
  const { data, error } = await createAdminClient()
    .from("properties")
    .select("id")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error(`lead property check failed: ${error.message}`);
  return data !== null;
};

const fetchPropertyBrief: LeadsDriver["fetchPropertyBrief"] = async (id) => {
  const { data, error } = await createAdminClient()
    .from("properties")
    .select("id,slug,title")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`lead similar_to lookup failed: ${error.message}`);
  return data ? { id: data.id, slug: data.slug, title: data.title } : null;
};

export const supabaseLeadsDriver: LeadsDriver = {
  insertLead,
  fetchLeadForDelivery,
  updateLeadDelivery,
  fetchDueLeadIds,
  fetchLeadsToAlert,
  markPlektanAlerted,
  isPropertyPublished,
  fetchPropertyBrief,
};
