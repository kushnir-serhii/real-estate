import "server-only";

import { createLead, type CreateLeadInput } from "@/lib/db/leads";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTurnstile } from "@/lib/turnstile";
import {
  HONEYPOT_FIELD,
  LEAD_ERROR_MESSAGES,
  LEAD_MESSAGES,
  leadFormSchema,
  parseUtm,
  TURNSTILE_FIELD,
} from "./lead-form-schema";
import { LEAD_FIELDS, type LeadField, type LeadFormState } from "./lead-state";

const PAGE_URL_MAX = 2048;

const isLeadField = (value: unknown): value is LeadField =>
  typeof value === "string" && (LEAD_FIELDS as readonly string[]).includes(value);

const stringOf = (value: unknown): string => (typeof value === "string" ? value : "");

/** Reads published property ids only: the client's `property_id` is never trusted. */
const isPublishedProperty = async (id: string): Promise<boolean> => {
  const { data, error } = await createAdminClient()
    .from("properties")
    .select("id")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error(`lead property check failed: ${error.message}`);
  return data !== null;
};

/** Sold/hidden (or any) property the visitor asked to find something similar to. Unknown id → null. */
const findSimilarTo = async (id: string): Promise<{ id: string; slug: string; title: string } | null> => {
  const { data, error } = await createAdminClient()
    .from("properties")
    .select("id,slug,title")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`lead similar_to lookup failed: ${error.message}`);
  return data ? { id: data.id, slug: data.slug, title: data.title } : null;
};

/**
 * The whole submit flow on plain data (what the server action calls with the FormData entries).
 * Order: honeypot (silent ok) → validation → Turnstile → property check → save.
 * Never logs personal data.
 */
export const processLeadSubmission = async (
  raw: Record<string, unknown>,
  context: { remoteIp?: string } = {},
): Promise<LeadFormState> => {
  if (stringOf(raw[HONEYPOT_FIELD]).trim() !== "") return { status: "ok" };

  const parsed = leadFormSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<LeadField, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (isLeadField(field) && fieldErrors[field] === undefined) fieldErrors[field] = issue.message;
    }
    if (Object.keys(fieldErrors).length === 0) fieldErrors.kind = LEAD_MESSAGES.generic;
    return { status: "invalid", fieldErrors };
  }
  const data = parsed.data;

  if (!(await verifyTurnstile(stringOf(raw[TURNSTILE_FIELD]), context.remoteIp))) {
    return { status: "error", message: LEAD_ERROR_MESSAGES.turnstile };
  }

  try {
    let payload: Record<string, unknown> | undefined;
    if (data.kind === "property_request") {
      if (!(await isPublishedProperty(data.property_id))) {
        return { status: "error", message: LEAD_ERROR_MESSAGES.property };
      }
    } else {
      const similarTo = data.similar_to ? await findSimilarTo(data.similar_to) : null;
      payload = {
        deal: data.deal,
        ...(data.property_type ? { property_type: data.property_type } : {}),
        ...(similarTo ? { similar_to: similarTo } : {}),
      };
    }

    const pageUrl = stringOf(raw.page_url).trim().slice(0, PAGE_URL_MAX);
    const input: CreateLeadInput = {
      kind: data.kind,
      client_request_id: data.client_request_id,
      name: data.name,
      phone: data.phone,
      email: data.email,
      message: data.message,
      consent_at: new Date().toISOString(),
      page_url: pageUrl === "" ? undefined : pageUrl,
      utm: parseUtm(raw.utm),
      ...(data.kind === "property_request" ? { property_id: data.property_id } : { payload }),
    };
    await createLead(input);
    // Slice 2: after(() => deliverLead(id)) goes here (Plektan + Telegram run after the response).
    return { status: "ok" };
  } catch {
    // The error text may carry personal data (row values): log nothing from it.
    console.error("submitLead: saving the lead failed");
    return { status: "error", message: LEAD_ERROR_MESSAGES.save };
  }
};
