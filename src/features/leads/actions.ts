"use server";

import { headers } from "next/headers";

import { processLeadSubmission } from "./submit-lead";
import type { LeadFormState } from "./lead-state";

/**
 * Server action for the lead forms: `useActionState(submitLead, initialLeadFormState)`.
 * Also callable directly: `await submitLead(initialLeadFormState, formData)`.
 * FormData fields: see `lead-form-schema.ts` (kind, client_request_id, name, phone, email, message,
 * consent, website [honeypot, leave empty], cf-turnstile-response, page_url, utm [JSON string],
 * property_id | deal, property_type, similar_to).
 */
export const submitLead = async (_prev: LeadFormState, formData: FormData): Promise<LeadFormState> => {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") raw[key] = value;
  }
  const requestHeaders = await headers();
  const remoteIp = requestHeaders.get("cf-connecting-ip") ?? undefined;
  return processLeadSubmission(raw, { remoteIp });
};
