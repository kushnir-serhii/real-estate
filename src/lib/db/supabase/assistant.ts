import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import type { AiConversation, AiHistoryMessage, AiMessage } from "../assistant";
import type { AssistantDriver } from "../driver-types";

const HISTORY_COLUMNS = "id,role,content,data,created_at";

const createConversation: AssistantDriver["createConversation"] = async (input): Promise<AiConversation> => {
  const { data, error } = await createAdminClient()
    .from("ai_conversations")
    .insert({
      page_url: input.pageUrl ?? null,
      property_id: input.propertyId ?? null,
      ip_hash: input.ipHash ?? null,
      turnstile_ok: input.turnstileOk ?? false,
    })
    .select("*")
    .single();
  if (error) throw new Error(`createConversation failed: ${error.message}`);
  return data;
};

const fetchConversation: AssistantDriver["fetchConversation"] = async (id) => {
  const { data, error } = await createAdminClient().from("ai_conversations").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`getConversation failed: ${error.message}`);
  return data;
};

const markConversationTurnstileOk: AssistantDriver["markConversationTurnstileOk"] = async (id, ipHash) => {
  const { error } = await createAdminClient()
    .from("ai_conversations")
    .update({ turnstile_ok: true, ip_hash: ipHash })
    .eq("id", id);
  if (error) throw new Error(`markConversationTurnstileOk failed: ${error.message}`);
};

const findUserMessageByClientId = async (
  conversationId: string,
  clientMessageId: string,
): Promise<Pick<AiMessage, "id" | "created_at"> | null> => {
  const { data, error } = await createAdminClient()
    .from("ai_messages")
    .select("id,created_at")
    .eq("conversation_id", conversationId)
    .eq("client_message_id", clientMessageId)
    .eq("role", "user")
    .maybeSingle();
  if (error) throw new Error(`findUserMessageByClientId failed: ${error.message}`);
  return data;
};

const countUserMessages: AssistantDriver["countUserMessages"] = async (conversationId) => {
  const { count, error } = await createAdminClient()
    .from("ai_messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .eq("role", "user");
  if (error) throw new Error(`countUserMessages failed: ${error.message}`);
  return count ?? 0;
};

const countUserMessagesByIp: AssistantDriver["countUserMessagesByIp"] = async (ipHash, sinceIso) => {
  const { count, error } = await createAdminClient()
    .from("ai_messages")
    .select("id,ai_conversations!inner(ip_hash)", { count: "exact", head: true })
    .eq("role", "user")
    .gte("created_at", sinceIso)
    .eq("ai_conversations.ip_hash", ipHash);
  if (error) throw new Error(`countUserMessagesByIp failed: ${error.message}`);
  return count ?? 0;
};

const fetchMonthCostUsd: AssistantDriver["fetchMonthCostUsd"] = async (month) => {
  const { data, error } = await createAdminClient().from("ai_usage").select("cost_usd").eq("month", month).maybeSingle();
  if (error) throw new Error(`getMonthCostUsd failed: ${error.message}`);
  return data?.cost_usd ?? 0;
};

const addMonthlyUsage: AssistantDriver["addMonthlyUsage"] = async (month, usage) => {
  const { error } = await createAdminClient().rpc("add_ai_usage", {
    p_month: month,
    p_input: usage.inputTokens,
    p_output: usage.outputTokens,
    p_cost: usage.costUsd,
  });
  if (error) throw new Error(`addMonthlyUsage failed: ${error.message}`);
};

const deleteConversationsBefore: AssistantDriver["deleteConversationsBefore"] = async (cutoffIso) => {
  const { count, error } = await createAdminClient()
    .from("ai_conversations")
    .delete({ count: "exact" })
    .lt("created_at", cutoffIso);
  if (error) throw new Error(`deleteConversationsBefore failed: ${error.message}`);
  return count ?? 0;
};

const deleteUsageBefore: AssistantDriver["deleteUsageBefore"] = async (cutoffMonth) => {
  const { count, error } = await createAdminClient()
    .from("ai_usage")
    .delete({ count: "exact" })
    .lt("month", cutoffMonth);
  if (error) throw new Error(`deleteUsageBefore failed: ${error.message}`);
  return count ?? 0;
};

const fetchConversationMessages = async (conversationId: string, limit: number): Promise<AiHistoryMessage[]> => {
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

const appendMessages: AssistantDriver["appendMessages"] = async (conversationId, messages) => {
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

const addConversationUsage: AssistantDriver["addConversationUsage"] = async (conversationId, usage) => {
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

const setConversationProposal: AssistantDriver["setConversationProposal"] = async (conversationId, proposal) => {
  const { error } = await createAdminClient().from("ai_conversations").update({ proposal }).eq("id", conversationId);
  if (error) throw new Error(`setConversationProposal failed: ${error.message}`);
};

const setConversationLead: AssistantDriver["setConversationLead"] = async (conversationId, leadId) => {
  const { error } = await createAdminClient()
    .from("ai_conversations")
    .update({ lead_id: leadId })
    .eq("id", conversationId);
  if (error) throw new Error(`setConversationLead failed: ${error.message}`);
};

const findLeadConversationId: AssistantDriver["findLeadConversationId"] = async (leadId) => {
  const { data, error } = await createAdminClient()
    .from("ai_conversations")
    .select("id")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getLeadTranscript failed: ${error.message}`);
  return data?.id ?? null;
};

export const supabaseAssistantDriver: AssistantDriver = {
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
