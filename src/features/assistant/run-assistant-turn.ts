import "server-only";

import { ASSISTANT_ERROR_MESSAGE } from "@/constants/assistant";
import {
  addConversationUsage,
  appendMessages,
  addMonthlyUsage,
  createConversation,
  findUserMessageByClientId,
  getConversation,
  getConversationMessages,
  markConversationTurnstileOk,
} from "@/lib/db/assistant";
import type { NewAiMessage } from "@/lib/db/assistant";
import { getPropertyBySlug } from "@/lib/db/properties";
import { costUsd, getLlm, isLlmError } from "@/lib/llm";
import type { Llm, LlmMessage, LlmToolCall, LlmUsage } from "@/lib/llm";
import { verifyTurnstile } from "@/lib/turnstile";

import { checkLimits, hashIp, usageMonth } from "./assistant-limits";
import { assistantToolCallsData, toLlmHistory, toolResultData } from "./assistant-history";
import type { AssistantEvent } from "./assistant-events";
import { ASSISTANT_TOOLS, runAssistantTool } from "./assistant-tools";
import { buildSystemPrompt } from "./build-system-prompt";
import type { PromptProperty } from "./build-system-prompt";

export { toLlmHistory } from "./assistant-history";

/** The model sees at most this many of the latest stored messages. */
export const HISTORY_LIMIT = 20;
/** Rounds in which the model may call tools in one turn; after that it must answer in text. */
export const MAX_TOOL_ROUNDS = 3;

export type AssistantTurnInput = {
  /** Unknown or forged ids start a new conversation. */
  conversationId?: string;
  message: string;
  pageUrl?: string;
  propertySlug?: string;
  /** Turnstile token; required with the first message of a conversation when a secret is configured. */
  turnstileToken?: string;
  /** Same id on a retry: the visitor message is stored once. */
  clientMessageId?: string;
  /** Raw visitor IP: only hashed for the rate limit and passed to Turnstile, never stored or logged. */
  clientIp?: string;
  signal?: AbortSignal;
};

export type AssistantTurnDeps = { llm?: Llm };

/** Published properties only: a hidden/sold or unknown slug gives no context. */
const resolveProperty = async (slug: string | undefined): Promise<(PromptProperty & { id: string }) | null> => {
  if (!slug) return null;
  try {
    const found = await getPropertyBySlug(slug);
    return found?.kind === "published" ? found.property : null;
  } catch {
    return null;
  }
};

/**
 * One visitor message: loads or creates the conversation, stores the message, streams the model's
 * reply as events (running up to MAX_TOOL_ROUNDS rounds of tool calls) and stores the replies, tool
 * calls and results, and the usage summed over all rounds. Never logs message contents or personal data.
 * Always ends with `done`; a failure becomes an `error` event with a fixed message.
 */
export async function* runAssistantTurn(
  input: AssistantTurnInput,
  deps: AssistantTurnDeps = {},
): AsyncGenerator<AssistantEvent> {
  const llm = deps.llm ?? getLlm();

  let conversationId: string;
  let history: LlmMessage[];
  let property: (PromptProperty & { id: string }) | null;
  try {
    const ipHash = await hashIp(input.clientIp);
    property = await resolveProperty(input.propertySlug);
    const existing = input.conversationId ? await getConversation(input.conversationId) : null;
    const duplicate =
      existing && input.clientMessageId ? await findUserMessageByClientId(existing.id, input.clientMessageId) : null;

    // Every check runs before the model is called and before anything is stored.
    const reason = await checkLimits({
      message: input.message,
      ipHash,
      conversationId: existing?.id,
      isRetry: duplicate !== null,
    });
    if (reason) {
      yield { type: "limit", reason };
      yield { type: "done" };
      return;
    }
    // Turnstile last, so a refused message doesn't burn the single-use token.
    const needsTurnstile = !existing || !existing.turnstile_ok;
    if (needsTurnstile && !(await verifyTurnstile(input.turnstileToken ?? "", input.clientIp))) {
      yield { type: "limit", reason: "turnstile" };
      yield { type: "done" };
      return;
    }

    let conversation = existing;
    if (!conversation) {
      conversation = await createConversation({
        pageUrl: input.pageUrl ?? null,
        propertyId: property?.id ?? null,
        ipHash,
        turnstileOk: true,
      });
    } else if (needsTurnstile) {
      await markConversationTurnstileOk(conversation.id, ipHash);
    }
    conversationId = conversation.id;

    const stored = await getConversationMessages(conversationId, HISTORY_LIMIT);
    // A retry continues from what came before the stored message, which is not stored again.
    const before = duplicate ? stored.filter((row) => row.created_at < duplicate.created_at) : stored;
    history = toLlmHistory(before);
    if (!duplicate) {
      // The visitor's message is stored before the model is called, so it survives a model failure.
      await appendMessages(conversationId, [
        { role: "user", content: input.message, ...(input.clientMessageId ? { client_message_id: input.clientMessageId } : {}) },
      ]);
    }
  } catch {
    console.error("[assistant] could not load the conversation");
    yield { type: "error", message: ASSISTANT_ERROR_MESSAGE };
    yield { type: "done" };
    return;
  }

  yield { type: "conversation", id: conversationId };

  const messages: LlmMessage[] = [
    { role: "system", content: buildSystemPrompt(property) },
    ...history,
    { role: "user", content: input.message },
  ];

  // Rows of finished rounds; an assistant tool-call row is only ever stored together with its results.
  const toStore: NewAiMessage[] = [];
  let roundText = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let sawUsage = false;
  let failed = false;
  try {
    for (let round = 0; ; round += 1) {
      const toolsAllowed = round < MAX_TOOL_ROUNDS;
      const toolCalls: LlmToolCall[] = [];
      roundText = "";

      for await (const event of llm.stream({
        messages,
        tools: toolsAllowed ? ASSISTANT_TOOLS : undefined,
        signal: input.signal,
      })) {
        switch (event.type) {
          case "text":
            roundText += event.delta;
            yield { type: "text", delta: event.delta };
            break;
          case "usage": {
            const usage: LlmUsage = event.usage;
            sawUsage = true;
            inputTokens += usage.inputTokens;
            outputTokens += usage.outputTokens;
            break;
          }
          case "tool_call":
            if (toolsAllowed) toolCalls.push(event.call);
            break;
          case "finish":
            break;
          default: {
            const unreachable: never = event;
            return unreachable;
          }
        }
      }

      if (toolCalls.length === 0) break;

      const results: { call: LlmToolCall; content: string }[] = [];
      for (const call of toolCalls) {
        const outcome = await runAssistantTool(call, { conversationId });
        results.push({ call, content: outcome.content });
        if (outcome.event) yield outcome.event;
      }
      messages.push({ role: "assistant", content: roundText, toolCalls });
      toStore.push({ role: "assistant", content: roundText, data: assistantToolCallsData(toolCalls) });
      for (const { call, content } of results) {
        messages.push({ role: "tool", toolCallId: call.id, content });
        toStore.push({ role: "tool", content, data: toolResultData(call) });
      }
      roundText = "";
    }
  } catch (error) {
    failed = true;
    console.error(`[assistant] model call failed (${isLlmError(error) ? error.kind : "unknown"})`);
  } finally {
    // Also runs when the visitor closes the stream: what was said is kept.
    try {
      if (roundText !== "") toStore.push({ role: "assistant", content: roundText });
      if (toStore.length > 0) await appendMessages(conversationId, toStore);
    } catch {
      console.error("[assistant] could not save the reply");
    }
    if (sawUsage) {
      const usage: LlmUsage = { inputTokens, outputTokens };
      const delta = { ...usage, costUsd: costUsd(llm.model, usage) };
      try {
        await addConversationUsage(conversationId, delta);
      } catch {
        console.error("[assistant] could not save the conversation usage");
      }
      try {
        await addMonthlyUsage(usageMonth(new Date()), delta);
      } catch {
        console.error("[assistant] could not save the monthly usage");
      }
    }
  }

  if (failed) yield { type: "error", message: ASSISTANT_ERROR_MESSAGE };
  yield { type: "done" };
}
