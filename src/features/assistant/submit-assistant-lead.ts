import "server-only";

import { after } from "next/server";
import { z } from "zod";

import { deliverLead } from "@/features/leads/deliver-lead";
import { leadCommonFields } from "@/features/leads/lead-form-schema";
import { getConversation, isPropertyPublished, setConversationLead } from "@/lib/db/assistant";
import { createLead } from "@/lib/db/leads";

import { ASSISTANT_LEAD_FIELDS, ASSISTANT_LEAD_MESSAGES } from "./assistant-lead-state";
import type { AssistantLeadField, AssistantLeadState } from "./assistant-lead-state";
import { storedProposalSchema } from "./propose-lead-tool";

/**
 * What the lead card sends. The wishes are NOT part of it: they come from the proposal stored on the
 * server. `honeypot` is a hidden input real visitors never fill.
 */
export const assistantLeadInputSchema = z.object({
  conversation_id: z.uuid({ error: ASSISTANT_LEAD_MESSAGES.stale }),
  proposal_id: z.uuid({ error: ASSISTANT_LEAD_MESSAGES.stale }),
  client_request_id: leadCommonFields.client_request_id,
  name: leadCommonFields.name,
  phone: leadCommonFields.phone,
  email: leadCommonFields.email,
  consent: leadCommonFields.consent,
});

export type AssistantLeadInput = {
  conversation_id: string;
  proposal_id: string;
  client_request_id: string;
  name: string;
  phone: string;
  email?: string;
  consent: boolean;
  honeypot: string;
};

const isField = (value: unknown): value is AssistantLeadField =>
  typeof value === "string" && (ASSISTANT_LEAD_FIELDS as readonly string[]).includes(value);

/** Never throws out of `after()`; the error text may carry personal data, so only a fixed line is logged. */
const deliverInBackground = async (id: string): Promise<void> => {
  try {
    await deliverLead(id);
  } catch {
    console.error("deliverLead: delivery failed");
  }
};

const stale: AssistantLeadState = { status: "error", message: ASSISTANT_LEAD_MESSAGES.stale };

/**
 * The confirmed lead card, on plain data. Order: honeypot (silent ok) → validation → the conversation
 * and its stored proposal → save → `lead_id` on the conversation → delivery after the response.
 * No Turnstile here: the conversation was Turnstile-checked when it started (spec 010, slice 4).
 * Never logs personal data.
 */
export const processAssistantLead = async (raw: unknown): Promise<AssistantLeadState> => {
  const record: Record<string, unknown> = typeof raw === "object" && raw !== null ? { ...raw } : {};
  if (typeof record.honeypot === "string" && record.honeypot.trim() !== "") return { status: "ok" };

  const parsed = assistantLeadInputSchema.safeParse(record);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<AssistantLeadField, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (isField(field) && fieldErrors[field] === undefined) fieldErrors[field] = issue.message;
    }
    if (Object.keys(fieldErrors).length === 0) return stale;
    return { status: "invalid", fieldErrors };
  }
  const data = parsed.data;

  try {
    const conversation = await getConversation(data.conversation_id);
    if (!conversation) return stale;
    const proposal = storedProposalSchema.safeParse(conversation.proposal);
    if (!proposal.success || proposal.data.proposal_id !== data.proposal_id) return stale;

    const propertyId =
      conversation.property_id && (await isPropertyPublished(conversation.property_id))
        ? conversation.property_id
        : undefined;

    const { id, created } = await createLead({
      kind: "ai",
      client_request_id: data.client_request_id,
      name: data.name,
      phone: data.phone,
      email: data.email,
      consent_at: new Date().toISOString(),
      page_url: conversation.page_url ?? undefined,
      property_id: propertyId,
      payload: { ...proposal.data.wishes, summary: proposal.data.summary, conversation_id: conversation.id },
    });

    try {
      await setConversationLead(conversation.id, id);
    } catch {
      // The lead is saved; only the link to the transcript is missing.
      console.error("submitAssistantLead: could not link the conversation");
    }
    // Plektan + Telegram run after the response; a failure is recorded on the lead and left to the cron.
    if (created) after(() => deliverInBackground(id));
    return { status: "ok" };
  } catch {
    console.error("submitAssistantLead: saving the lead failed");
    return { status: "error", message: ASSISTANT_LEAD_MESSAGES.save };
  }
};

