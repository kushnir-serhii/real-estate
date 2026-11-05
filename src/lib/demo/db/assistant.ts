import "server-only";

import type { AiConversation, AiHistoryMessage } from "@/lib/db/assistant";
import type { AssistantDriver } from "@/lib/db/driver-types";
import type { Database } from "@/lib/supabase/database.types";

import { getDemoStore } from "../store";
import { toJson } from "./json";

type ConversationRow = Database["public"]["Tables"]["ai_conversations"]["Row"];
type MessageRow = Database["public"]["Tables"]["ai_messages"]["Row"];

const MESSAGE_ROLES: readonly string[] = ["user", "assistant", "tool"];

const copyConversation = (row: ConversationRow): AiConversation => ({ ...row, proposal: toJson(row.proposal) });

const requireConversation = (id: string, action: string): ConversationRow => {
  const row = getDemoStore().ai_conversations.find((conversation) => conversation.id === id);
  if (!row) throw new Error(`${action} failed: conversation not found`);
  return row;
};

/** `set_updated_at` trigger on ai_conversations. */
const touch = (row: ConversationRow): void => {
  row.updated_at = new Date().toISOString();
};

const compareDesc = (a: MessageRow, b: MessageRow): number => {
  const byTime = Date.parse(b.created_at) - Date.parse(a.created_at);
  if (byTime !== 0) return byTime;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
};

/** Mirrors the column defaults and the `property_id` foreign key of migration ai_assistant. */
const createConversation: AssistantDriver["createConversation"] = async (input) => {
  const store = getDemoStore();
  if (input.propertyId && !store.properties.some((property) => property.id === input.propertyId)) {
    throw new Error("createConversation failed: property_id violates foreign key constraint");
  }
  const now = new Date().toISOString();
  const row: ConversationRow = {
    id: crypto.randomUUID(),
    created_at: now,
    updated_at: now,
    page_url: input.pageUrl ?? null,
    property_id: input.propertyId ?? null,
    lead_id: null,
    proposal: null,
    message_count: 0,
    input_tokens: 0,
    output_tokens: 0,
    cost_usd: 0,
    ip_hash: input.ipHash ?? null,
    turnstile_ok: input.turnstileOk ?? false,
  };
  store.ai_conversations.push(row);
  return copyConversation(row);
};

const fetchConversation: AssistantDriver["fetchConversation"] = async (id) => {
  const row = getDemoStore().ai_conversations.find((conversation) => conversation.id === id);
  return row ? copyConversation(row) : null;
};

/** Like the SQL update, an unknown id changes nothing. */
const markConversationTurnstileOk: AssistantDriver["markConversationTurnstileOk"] = async (id, ipHash) => {
  const row = getDemoStore().ai_conversations.find((conversation) => conversation.id === id);
  if (!row) return;
  row.turnstile_ok = true;
  row.ip_hash = ipHash;
  touch(row);
};

const findUserMessageByClientId: AssistantDriver["findUserMessageByClientId"] = async (conversationId, clientMessageId) => {
  const row = getDemoStore().ai_messages.find(
    (message) =>
      message.conversation_id === conversationId && message.client_message_id === clientMessageId && message.role === "user",
  );
  return row ? { id: row.id, created_at: row.created_at } : null;
};

const countUserMessages: AssistantDriver["countUserMessages"] = async (conversationId) =>
  getDemoStore().ai_messages.filter((message) => message.conversation_id === conversationId && message.role === "user")
    .length;

/** Joins messages to their conversation's `ip_hash` (the `!inner` embed). */
const countUserMessagesByIp: AssistantDriver["countUserMessagesByIp"] = async (ipHash, sinceIso) => {
  const store = getDemoStore();
  const since = Date.parse(sinceIso);
  const ownConversations = new Set(
    store.ai_conversations.filter((conversation) => conversation.ip_hash === ipHash).map((conversation) => conversation.id),
  );
  return store.ai_messages.filter(
    (message) =>
      message.role === "user" && Date.parse(message.created_at) >= since && ownConversations.has(message.conversation_id),
  ).length;
};

const fetchMonthCostUsd: AssistantDriver["fetchMonthCostUsd"] = async (month) =>
  getDemoStore().ai_usage.find((row) => row.month === month)?.cost_usd ?? 0;

/** The `add_ai_usage` function: insert, or add to the month's row (single-threaded here, so atomic). */
const addMonthlyUsage: AssistantDriver["addMonthlyUsage"] = async (month, usage) => {
  const store = getDemoStore();
  const now = new Date().toISOString();
  const row = store.ai_usage.find((entry) => entry.month === month);
  if (row) {
    row.input_tokens += usage.inputTokens;
    row.output_tokens += usage.outputTokens;
    row.cost_usd += usage.costUsd;
    row.updated_at = now;
    return;
  }
  store.ai_usage.push({
    month,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    cost_usd: usage.costUsd,
    updated_at: now,
  });
};

/** `on delete cascade` for messages; leads stay (the link lives on the conversation, which is gone). */
const deleteConversationsBefore: AssistantDriver["deleteConversationsBefore"] = async (cutoffIso) => {
  const store = getDemoStore();
  const cutoff = Date.parse(cutoffIso);
  const doomed = new Set(
    store.ai_conversations.filter((row) => Date.parse(row.created_at) < cutoff).map((row) => row.id),
  );
  if (doomed.size === 0) return 0;
  store.ai_conversations = store.ai_conversations.filter((row) => !doomed.has(row.id));
  store.ai_messages = store.ai_messages.filter((row) => !doomed.has(row.conversation_id));
  return doomed.size;
};

const deleteUsageBefore: AssistantDriver["deleteUsageBefore"] = async (cutoffMonth) => {
  const store = getDemoStore();
  const before = store.ai_usage.length;
  // `YYYY-MM-DD` strings sort like dates.
  store.ai_usage = store.ai_usage.filter((row) => row.month >= cutoffMonth);
  return before - store.ai_usage.length;
};

/** Newest `limit` rows (created_at, then id, descending), returned oldest first. */
const fetchConversationMessages: AssistantDriver["fetchConversationMessages"] = async (
  conversationId,
  limit,
): Promise<AiHistoryMessage[]> =>
  getDemoStore()
    .ai_messages.filter((message) => message.conversation_id === conversationId)
    .sort(compareDesc)
    .slice(0, limit)
    .reverse()
    .map(({ id, role, content, data, created_at }) => ({ id, role, content, data: toJson(data), created_at }));

/**
 * One insert statement: the foreign key, the role check and the unique (conversation, client message id)
 * index are checked for the whole batch before anything is stored (a null client id never collides).
 */
const appendMessages: AssistantDriver["appendMessages"] = async (conversationId, messages) => {
  const store = getDemoStore();
  const conversation = requireConversation(conversationId, "appendMessages");
  const seen = new Set(
    store.ai_messages
      .filter((message) => message.conversation_id === conversationId && message.client_message_id !== null)
      .map((message) => message.client_message_id),
  );
  for (const message of messages) {
    if (!MESSAGE_ROLES.includes(message.role)) throw new Error("appendMessages failed: invalid message role");
    const clientId = message.client_message_id ?? null;
    if (clientId !== null) {
      if (seen.has(clientId)) throw new Error("appendMessages failed: duplicate client_message_id");
      seen.add(clientId);
    }
  }
  // Distinct, increasing timestamps keep the order stable within one insert. Unlike Postgres (whose calls are
  // slower than a millisecond apart in practice) the in-memory store can be called twice in one millisecond,
  // and the id tie-break is random, so continue after the conversation's latest message.
  const latest = store.ai_messages.reduce(
    (max, message) => (message.conversation_id === conversationId ? Math.max(max, Date.parse(message.created_at)) : max),
    0,
  );
  const base = Math.max(Date.now(), latest + 1);
  messages.forEach((message, index) => {
    store.ai_messages.push({
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      role: message.role,
      content: message.content ?? "",
      data: toJson(message.data),
      client_message_id: message.client_message_id ?? null,
      created_at: new Date(base + index).toISOString(),
    });
  });
  conversation.message_count += messages.length;
  touch(conversation);
};

const addConversationUsage: AssistantDriver["addConversationUsage"] = async (conversationId, usage) => {
  const row = requireConversation(conversationId, "addConversationUsage");
  row.input_tokens += usage.inputTokens;
  row.output_tokens += usage.outputTokens;
  row.cost_usd += usage.costUsd;
  touch(row);
};

const setConversationProposal: AssistantDriver["setConversationProposal"] = async (conversationId, proposal) => {
  const row = getDemoStore().ai_conversations.find((conversation) => conversation.id === conversationId);
  if (!row) return;
  row.proposal = toJson(proposal);
  touch(row);
};

/** `lead_id` foreign key: a lead that doesn't exist is rejected. */
const setConversationLead: AssistantDriver["setConversationLead"] = async (conversationId, leadId) => {
  const store = getDemoStore();
  if (!store.leads.some((lead) => lead.id === leadId)) {
    throw new Error("setConversationLead failed: lead_id violates foreign key constraint");
  }
  const row = store.ai_conversations.find((conversation) => conversation.id === conversationId);
  if (!row) return;
  row.lead_id = leadId;
  touch(row);
};

const findLeadConversationId: AssistantDriver["findLeadConversationId"] = async (leadId) => {
  const rows = getDemoStore()
    .ai_conversations.filter((row) => row.lead_id === leadId)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  return rows[0]?.id ?? null;
};

export const demoAssistantDriver: AssistantDriver = {
  createConversation,
  fetchConversation,
  markConversationTurnstileOk,
  findUserMessageByClientId,
  countUserMessages,
  countUserMessagesByIp,
  fetchMonthCostUsd,
  addMonthlyUsage,
  deleteConversationsBefore,
  deleteUsageBefore,
  fetchConversationMessages,
  appendMessages,
  addConversationUsage,
  setConversationProposal,
  setConversationLead,
  findLeadConversationId,
};
