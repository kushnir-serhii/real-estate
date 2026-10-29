import { z } from "zod";

import type { LlmMessage, LlmToolCall } from "@/lib/llm/types";

/** `ai_messages.data` of an assistant row that called tools. */
export const assistantMessageDataSchema = z.object({
  tool_calls: z.array(z.object({ id: z.string(), name: z.string(), arguments: z.string() })).min(1),
});

/** `ai_messages.data` of a `tool` row: which call it answers. */
export const toolMessageDataSchema = z.object({ tool_call_id: z.string(), name: z.string() });

export const assistantToolCallsData = (calls: readonly LlmToolCall[]): z.infer<typeof assistantMessageDataSchema> => ({
  tool_calls: calls.map((call) => ({ id: call.id, name: call.name, arguments: call.arguments })),
});

export const toolResultData = (call: LlmToolCall): z.infer<typeof toolMessageDataSchema> => ({
  tool_call_id: call.id,
  name: call.name,
});

export type HistoryRow = { role: string; content: string; data?: unknown };

const callsOf = (row: HistoryRow): LlmToolCall[] => {
  const parsed = assistantMessageDataSchema.safeParse(row.data);
  return parsed.success ? parsed.data.tool_calls : [];
};

/**
 * Prompt history from stored rows (oldest first). An assistant message with tool calls is kept only
 * together with a `tool` message for every call; otherwise only its text survives. A `tool` row without
 * its call (e.g. cut off by the history limit) is dropped, so the model never gets an invalid sequence.
 */
export const toLlmHistory = (rows: readonly HistoryRow[]): LlmMessage[] => {
  const out: LlmMessage[] = [];
  let i = 0;
  while (i < rows.length) {
    const row = rows[i];
    if (!row) break;
    i += 1;
    if (row.role === "user") {
      out.push({ role: "user", content: row.content });
      continue;
    }
    if (row.role !== "assistant") continue; // an orphaned tool row

    const calls = callsOf(row);
    const results = new Map<string, string>();
    while (rows[i]?.role === "tool") {
      const answered = toolMessageDataSchema.safeParse(rows[i]?.data);
      if (answered.success) results.set(answered.data.tool_call_id, rows[i]?.content ?? "");
      i += 1;
    }
    if (calls.length > 0 && calls.every((call) => results.has(call.id))) {
      out.push({ role: "assistant", content: row.content, toolCalls: calls });
      for (const call of calls) out.push({ role: "tool", toolCallId: call.id, content: results.get(call.id) ?? "" });
    } else if (row.content !== "") {
      out.push({ role: "assistant", content: row.content });
    }
  }
  return out;
};
