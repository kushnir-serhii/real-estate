import "server-only";

import { z } from "zod";

import { isDemoMode } from "@/lib/data-driver";
import type { Database } from "@/lib/supabase/database.types";

import type { AssistantDriver } from "./driver-types";
import { isPropertyPublished as isLeadPropertyPublished } from "./leads";

type Tables = Database["public"]["Tables"];

export type AiConversation = Tables["ai_conversations"]["Row"];
export type AiMessage = Tables["ai_messages"]["Row"];
export type AiMessageRole = AiMessage["role"];

/** Roles allowed by the table's check constraint. */
export const AI_MESSAGE_ROLES = ["user", "assistant", "tool"] as const satisfies readonly AiMessageRole[];

export type NewAiMessage = Pick<Tables["ai_messages"]["Insert"], "role" | "content" | "data" | "client_message_id">;
export type NewAiConversation = {
  pageUrl?: string | null;
  propertyId?: string | null;
  /** Salted hash, never the raw address. */
  ipHash?: string | null;
  turnstileOk?: boolean;
};
export type AiUsageDelta = { inputTokens: number; outputTokens: number; costUsd: number };

/** Prompt history only needs these columns. */
export type AiHistoryMessage = Pick<AiMessage, "id" | "role" | "content" | "data" | "created_at">;

/** What `ai_conversations.proposal` holds (jsonb). */
export type StoredProposalJson = NonNullable<Tables["ai_conversations"]["Update"]["proposal"]>;

/** The driver is picked per call (env is read lazily) and loaded on demand, so the other one never enters the request. */
const loadDriver = async (): Promise<AssistantDriver> =>
  isDemoMode()
    ? (await import("@/lib/demo/db/assistant")).demoAssistantDriver
    : (await import("@/lib/db/supabase/assistant")).supabaseAssistantDriver;

export const createConversation = async (input: NewAiConversation): Promise<AiConversation> =>
  (await loadDriver()).createConversation(input);

/** The conversation, or null when the id is unknown (a forged or expired id). */
export const getConversation = async (id: string): Promise<AiConversation | null> =>
  (await loadDriver()).fetchConversation(id);

/** Marks an existing conversation as Turnstile-checked and stores the visitor's salted IP hash. */
export const markConversationTurnstileOk = async (id: string, ipHash: string): Promise<void> =>
  (await loadDriver()).markConversationTurnstileOk(id, ipHash);

/** The stored visitor message with this client id (a retry), or null. */
export const findUserMessageByClientId = async (
  conversationId: string,
  clientMessageId: string,
): Promise<Pick<AiMessage, "id" | "created_at"> | null> =>
  (await loadDriver()).findUserMessageByClientId(conversationId, clientMessageId);

/** Visitor messages stored in one conversation. */
export const countUserMessages = async (conversationId: string): Promise<number> =>
  (await loadDriver()).countUserMessages(conversationId);

/** Visitor messages since `sinceIso` in conversations of this hashed IP. */
export const countUserMessagesByIp = async (ipHash: string, sinceIso: string): Promise<number> =>
  (await loadDriver()).countUserMessagesByIp(ipHash, sinceIso);

/** Spend of a month (`month` = first day, `YYYY-MM-01`); 0 when nothing is recorded. */
export const getMonthCostUsd = async (month: string): Promise<number> => (await loadDriver()).fetchMonthCostUsd(month);

/** Atomic add to the month's counter (SQL function, service role only). */
export const addMonthlyUsage = async (month: string, usage: AiUsageDelta): Promise<void> =>
  (await loadDriver()).addMonthlyUsage(month, usage);

/** Deletes conversations created before `cutoffIso` (messages cascade; leads are untouched). Returns the count. */
export const deleteConversationsBefore = async (cutoffIso: string): Promise<number> =>
  (await loadDriver()).deleteConversationsBefore(cutoffIso);

/** Deletes monthly usage rows older than `cutoffMonth` (`YYYY-MM-01`). */
export const deleteUsageBefore = async (cutoffMonth: string): Promise<number> =>
  (await loadDriver()).deleteUsageBefore(cutoffMonth);

/** The last `limit` messages of a conversation, oldest first. */
export const getConversationMessages = async (conversationId: string, limit = 200): Promise<AiHistoryMessage[]> =>
  (await loadDriver()).fetchConversationMessages(conversationId, limit);

/**
 * Appends messages in the given order and bumps `message_count`. Not atomic (read, then write): a
 * conversation handles one turn at a time, and the count is only a cap, not a ledger.
 */
export const appendMessages = async (conversationId: string, messages: readonly NewAiMessage[]): Promise<void> => {
  if (messages.length === 0) return;
  await (await loadDriver()).appendMessages(conversationId, messages);
};

/** Adds token usage and cost of one LLM call to the conversation. */
export const addConversationUsage = async (conversationId: string, usage: AiUsageDelta): Promise<void> =>
  (await loadDriver()).addConversationUsage(conversationId, usage);

/** Stores the model's lead proposal on the conversation; a new one replaces the old. */
export const setConversationProposal = async (conversationId: string, proposal: StoredProposalJson): Promise<void> =>
  (await loadDriver()).setConversationProposal(conversationId, proposal);

/** Links the conversation to the lead created from its confirmed card. */
export const setConversationLead = async (conversationId: string, leadId: string): Promise<void> =>
  (await loadDriver()).setConversationLead(conversationId, leadId);

/** True only for a published property: the lead's `property_id` is never taken on trust. */
export const isPropertyPublished = (id: string): Promise<boolean> => isLeadPropertyPublished(id);

export type TranscriptProperty = { title: string; url: string };
export type TranscriptMessage = {
  role: "user" | "assistant";
  content: string;
  created_at: string;
  /** Properties the assistant found just before this message (titles and site paths only). */
  properties?: TranscriptProperty[];
};
export type LeadTranscript = { status: "available"; messages: TranscriptMessage[] } | { status: "deleted" };

const toolNameSchema = z.object({ name: z.string() });

const searchResultSchema = z.object({
  items: z.array(z.object({ title: z.string(), url: z.string() })),
});

/** `search_properties` tool result → the properties it found; anything else (or malformed) → none. */
const foundProperties = (row: Pick<AiHistoryMessage, "content" | "data">): TranscriptProperty[] => {
  if (toolNameSchema.safeParse(row.data).data?.name !== "search_properties") return [];
  let json: unknown;
  try {
    json = JSON.parse(row.content);
  } catch {
    return [];
  }
  const parsed = searchResultSchema.safeParse(json);
  return parsed.success ? parsed.data.items.map(({ title, url }) => ({ title, url })) : [];
};

/**
 * Visitor and assistant messages for the admin; tool rows never show as JSON: a search result is
 * attached (titles and links) to the next assistant message with text. Assistant rows that only
 * carried tool calls are skipped.
 */
export const toTranscript = (rows: readonly Pick<AiHistoryMessage, "role" | "content" | "data" | "created_at">[]): TranscriptMessage[] => {
  const messages: TranscriptMessage[] = [];
  let pending: TranscriptProperty[] = [];
  for (const row of rows) {
    if (row.role === "tool") {
      pending = pending.concat(foundProperties(row));
    } else if (row.role === "user") {
      messages.push({ role: "user", content: row.content, created_at: row.created_at });
    } else if (row.role === "assistant" && row.content.trim() !== "") {
      messages.push({
        role: "assistant",
        content: row.content,
        created_at: row.created_at,
        ...(pending.length > 0 ? { properties: pending } : {}),
      });
      pending = [];
    }
  }
  return messages;
};

/**
 * The chat behind a lead (service role). Call it only after the page has loaded the lead through the
 * admin's session (RLS), as the lead detail page does. No conversation (cleaned up after 30 days) → `deleted`.
 */
export const getLeadTranscript = async (leadId: string): Promise<LeadTranscript> => {
  const conversationId = await (await loadDriver()).findLeadConversationId(leadId);
  if (!conversationId) return { status: "deleted" };
  return { status: "available", messages: toTranscript(await getConversationMessages(conversationId, 500)) };
};
