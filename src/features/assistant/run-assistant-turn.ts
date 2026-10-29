import "server-only";

import { ASSISTANT_ERROR_MESSAGE } from "@/constants/assistant";
import {
  addConversationUsage,
  appendMessages,
  createConversation,
  getConversation,
  getConversationMessages,
} from "@/lib/db/assistant";
import type { AiHistoryMessage } from "@/lib/db/assistant";
import { getPropertyBySlug } from "@/lib/db/properties";
import { costUsd, getLlm, isLlmError } from "@/lib/llm";
import type { Llm, LlmMessage, LlmUsage } from "@/lib/llm";

import type { AssistantEvent } from "./assistant-events";
import { buildSystemPrompt } from "./build-system-prompt";
import type { PromptProperty } from "./build-system-prompt";

/** The model sees at most this many of the latest stored messages. */
export const HISTORY_LIMIT = 20;

export type AssistantTurnInput = {
  /** Unknown or forged ids start a new conversation. */
  conversationId?: string;
  message: string;
  pageUrl?: string;
  propertySlug?: string;
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

/** Prompt history from the DB: visitor and assistant turns only (tool rows join in slice 2). */
export const toLlmHistory = (rows: readonly Pick<AiHistoryMessage, "role" | "content">[]): LlmMessage[] =>
  rows.flatMap((row): LlmMessage[] => {
    if (row.role === "user") return [{ role: "user", content: row.content }];
    if (row.role === "assistant" && row.content !== "") return [{ role: "assistant", content: row.content }];
    return [];
  });

/**
 * One visitor message: loads or creates the conversation, stores the message, streams the model's
 * reply as events and stores the reply and the usage. Never logs message contents or personal data.
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
    property = await resolveProperty(input.propertySlug);
    const existing = input.conversationId ? await getConversation(input.conversationId) : null;
    const conversation =
      existing ?? (await createConversation({ pageUrl: input.pageUrl ?? null, propertyId: property?.id ?? null }));
    conversationId = conversation.id;
    history = toLlmHistory(await getConversationMessages(conversationId, HISTORY_LIMIT));
    // The visitor's message is stored before the model is called, so it survives a model failure.
    await appendMessages(conversationId, [{ role: "user", content: input.message }]);
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

  let reply = "";
  let usage: LlmUsage | null = null;
  let failed = false;
  try {
    for await (const event of llm.stream({ messages, signal: input.signal })) {
      switch (event.type) {
        case "text":
          reply += event.delta;
          yield { type: "text", delta: event.delta };
          break;
        case "usage":
          usage = event.usage;
          break;
        case "tool_call": // No tools in this slice.
        case "finish":
          break;
        default: {
          const unreachable: never = event;
          return unreachable;
        }
      }
    }
  } catch (error) {
    failed = true;
    console.error(`[assistant] model call failed (${isLlmError(error) ? error.kind : "unknown"})`);
  } finally {
    // Also runs when the visitor closes the stream: what was said is kept.
    try {
      if (reply !== "") await appendMessages(conversationId, [{ role: "assistant", content: reply }]);
      if (usage) {
        await addConversationUsage(conversationId, {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          costUsd: costUsd(llm.model, usage),
        });
      }
    } catch {
      console.error("[assistant] could not save the reply");
    }
  }

  if (failed) yield { type: "error", message: ASSISTANT_ERROR_MESSAGE };
  yield { type: "done" };
}
