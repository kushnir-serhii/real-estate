import "server-only";

import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];

export type AiConversation = Tables["ai_conversations"]["Row"];
export type AiMessage = Tables["ai_messages"]["Row"];
export type AiMessageRole = AiMessage["role"];

/** Roles allowed by the table's check constraint. */
export const AI_MESSAGE_ROLES = ["user", "assistant", "tool"] as const satisfies readonly AiMessageRole[];

export type NewAiMessage = Pick<Tables["ai_messages"]["Insert"], "role" | "content" | "data">;
export type NewAiConversation = { pageUrl?: string | null; propertyId?: string | null };
export type AiUsageDelta = { inputTokens: number; outputTokens: number; costUsd: number };

/** Prompt history only needs these columns. */
export type AiHistoryMessage = Pick<AiMessage, "id" | "role" | "content" | "data" | "created_at">;

const HISTORY_COLUMNS = "id,role,content,data,created_at";

export const createConversation = async (input: NewAiConversation): Promise<AiConversation> => {
  const { data, error } = await createAdminClient()
    .from("ai_conversations")
    .insert({ page_url: input.pageUrl ?? null, property_id: input.propertyId ?? null })
    .select("*")
    .single();
  if (error) throw new Error(`createConversation failed: ${error.message}`);
  return data;
};

/** The conversation, or null when the id is unknown (a forged or expired id). */
export const getConversation = async (id: string): Promise<AiConversation | null> => {
  const { data, error } = await createAdminClient().from("ai_conversations").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`getConversation failed: ${error.message}`);
  return data;
};

/** The last `limit` messages of a conversation, oldest first. */
export const getConversationMessages = async (conversationId: string, limit = 200): Promise<AiHistoryMessage[]> => {
  const { data, error } = await createAdminClient()
    .from("ai_messages")
    .select(HISTORY_COLUMNS)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`getConversationMessages failed: ${error.message}`);
  return data.reverse();
};

/**
 * Appends messages in the given order and bumps `message_count`. Not atomic (read, then write): a
 * conversation handles one turn at a time, and the count is only a cap, not a ledger.
 */
export const appendMessages = async (conversationId: string, messages: readonly NewAiMessage[]): Promise<void> => {
  if (messages.length === 0) return;
  const supabase = createAdminClient();
  // Distinct, increasing timestamps keep the order stable within one insert.
  const base = Date.now();
  const rows = messages.map((message, index) => ({
    ...message,
    conversation_id: conversationId,
    created_at: new Date(base + index).toISOString(),
  }));
  const { error } = await supabase.from("ai_messages").insert(rows);
  if (error) throw new Error(`appendMessages failed: ${error.message}`);

  const { data: current, error: readError } = await supabase
    .from("ai_conversations")
    .select("message_count")
    .eq("id", conversationId)
    .single();
  if (readError) throw new Error(`appendMessages failed: ${readError.message}`);
  const { error: updateError } = await supabase
    .from("ai_conversations")
    .update({ message_count: current.message_count + messages.length })
    .eq("id", conversationId);
  if (updateError) throw new Error(`appendMessages failed: ${updateError.message}`);
};

/** Adds token usage and cost of one LLM call to the conversation. */
export const addConversationUsage = async (conversationId: string, usage: AiUsageDelta): Promise<void> => {
  const supabase = createAdminClient();
  const { data: current, error: readError } = await supabase
    .from("ai_conversations")
    .select("input_tokens,output_tokens,cost_usd")
    .eq("id", conversationId)
    .single();
  if (readError) throw new Error(`addConversationUsage failed: ${readError.message}`);
  const { error } = await supabase
    .from("ai_conversations")
    .update({
      input_tokens: current.input_tokens + usage.inputTokens,
      output_tokens: current.output_tokens + usage.outputTokens,
      cost_usd: current.cost_usd + usage.costUsd,
    })
    .eq("id", conversationId);
  if (error) throw new Error(`addConversationUsage failed: ${error.message}`);
};

type Json = Database["public"]["Tables"]["ai_conversations"]["Update"]["proposal"];

/** Stores the model's lead proposal on the conversation; a new one replaces the old. */
export const setConversationProposal = async (conversationId: string, proposal: NonNullable<Json>): Promise<void> => {
  const { error } = await createAdminClient()
    .from("ai_conversations")
    .update({ proposal })
    .eq("id", conversationId);
  if (error) throw new Error(`setConversationProposal failed: ${error.message}`);
};

/** Links the conversation to the lead created from its confirmed card. */
export const setConversationLead = async (conversationId: string, leadId: string): Promise<void> => {
  const { error } = await createAdminClient()
    .from("ai_conversations")
    .update({ lead_id: leadId })
    .eq("id", conversationId);
  if (error) throw new Error(`setConversationLead failed: ${error.message}`);
};

/** True only for a published property: the lead's `property_id` is never taken on trust. */
export const isPropertyPublished = async (id: string): Promise<boolean> => {
  const { data, error } = await createAdminClient()
    .from("properties")
    .select("id")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error(`isPropertyPublished failed: ${error.message}`);
  return data !== null;
};

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
  const supabase = createAdminClient();
  const { data: conversation, error } = await supabase
    .from("ai_conversations")
    .select("id")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getLeadTranscript failed: ${error.message}`);
  if (!conversation) return { status: "deleted" };
  return { status: "available", messages: toTranscript(await getConversationMessages(conversation.id, 500)) };
};
