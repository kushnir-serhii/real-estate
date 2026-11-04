import "server-only";

import { after } from "next/server";

import { createLead, getPropertyBrief, isPropertyPublished, type CreateLeadInput } from "@/lib/db/leads";
import { verifyTurnstile } from "@/lib/turnstile";
import {
  HONEYPOT_FIELD,
  LEAD_ERROR_MESSAGES,
  LEAD_MESSAGES,
  leadFormSchema,
  parseUtm,
  TURNSTILE_FIELD,
} from "./lead-form-schema";
import { deliverLead } from "./deliver-lead";
import { LEAD_FIELDS, type LeadField, type LeadFormState } from "./lead-state";

const PAGE_URL_MAX = 2048;

const isLeadField = (value: unknown): value is LeadField =>
  typeof value === "string" && (LEAD_FIELDS as readonly string[]).includes(value);

const stringOf = (value: unknown): string => (typeof value === "string" ? value : "");

/** Never throws out of `after()`; the error text may carry personal data, so only a fixed line is logged. */
const deliverInBackground = async (id: string): Promise<void> => {
  try {
    await deliverLead(id);
  } catch {
    console.error("deliverLead: delivery failed");
  }
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
      if (!(await isPropertyPublished(data.property_id))) {
        return { status: "error", message: LEAD_ERROR_MESSAGES.property };
      }
    } else {
      const similarTo = data.similar_to ? await getPropertyBrief(data.similar_to) : null;
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
    const { id, created } = await createLead(input);
    // Plektan + Telegram run after the response; a failure is recorded on the lead and left to the cron.
    if (created) after(() => deliverInBackground(id));
    return { status: "ok" };
  } catch {
    // The error text may carry personal data (row values): log nothing from it.
    console.error("submitLead: saving the lead failed");
    return { status: "error", message: LEAD_ERROR_MESSAGES.save };
  }
};
