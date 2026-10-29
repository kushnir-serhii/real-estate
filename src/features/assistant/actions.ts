"use server";

import { processAssistantLead } from "./submit-assistant-lead";
import type { AssistantLeadInput } from "./submit-assistant-lead";
import type { AssistantLeadState } from "./assistant-lead-state";

/**
 * Server action for the chat's lead card: `await submitAssistantLead({ conversation_id, proposal_id,
 * client_request_id, name, phone, email?, consent, honeypot })`. Server actions take untrusted input,
 * so the object is validated in `processAssistantLead`; the wishes are never taken from it.
 */
export const submitAssistantLead = async (input: AssistantLeadInput): Promise<AssistantLeadState> =>
  processAssistantLead(input);
