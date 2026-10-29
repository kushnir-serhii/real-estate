import "server-only";

import { LlmError } from "./errors";
import { parseChatCompletionStream, readSseData } from "./parse-stream";
import type { Llm, LlmEvent, LlmMessage, LlmRequest, LlmToolDefinition } from "./types";

const CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
export const DEFAULT_LLM_MODEL = "gpt-4o-mini";
/** Whole request including the streamed body. */
const TIMEOUT_MS = 45_000;

export type LlmConfig = {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
};

export const resolveLlmModel = (model: string | undefined): string => {
  const wanted = (model ?? "").trim();
  return wanted === "" ? DEFAULT_LLM_MODEL : wanted;
};

/** Empty key = fixture assistant. */
export const isLlmConfigured = (config: LlmConfig): boolean => (config.apiKey ?? "").trim() !== "";

const toWireMessage = (message: LlmMessage): Record<string, unknown> => {
  switch (message.role) {
    case "system":
    case "user":
      return { role: message.role, content: message.content };
    case "assistant": {
      const calls = message.toolCalls ?? [];
      if (calls.length === 0) return { role: "assistant", content: message.content };
      return {
        role: "assistant",
        content: message.content === "" ? null : message.content,
        tool_calls: calls.map((call) => ({
          id: call.id,
          type: "function",
          function: { name: call.name, arguments: call.arguments },
        })),
      };
    }
    case "tool":
      return { role: "tool", tool_call_id: message.toolCallId, content: message.content };
    default: {
      const unreachable: never = message;
      return unreachable;
    }
  }
};

const toWireTool = (tool: LlmToolDefinition) => ({
  type: "function",
  function: { name: tool.name, description: tool.description, parameters: tool.parameters },
});

const isTimeout = (error: unknown): boolean =>
  error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");

const toLlmError = (error: unknown): LlmError => {
  if (error instanceof LlmError) return error;
  // Only the error name: messages can echo request details.
  if (isTimeout(error)) return new LlmError({ kind: "timeout", message: "request timed out or was aborted" });
  return new LlmError({
    kind: "network",
    message: `request failed (${error instanceof Error ? error.name : "unknown"})`,
  });
};

async function* iterateBody(body: ReadableStream<Uint8Array>): AsyncGenerator<Uint8Array> {
  const reader = body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return;
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

async function* streamChat(config: LlmConfig, model: string, request: LlmRequest): AsyncGenerator<LlmEvent> {
  const fetchImpl = config.fetch ?? fetch;
  const timeout = AbortSignal.timeout(config.timeoutMs ?? TIMEOUT_MS);
  const signal = request.signal ? AbortSignal.any([timeout, request.signal]) : timeout;
  try {
    const response = await fetchImpl(CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${(config.apiKey ?? "").trim()}` },
      body: JSON.stringify({
        model,
        stream: true,
        stream_options: { include_usage: true },
        messages: request.messages.map(toWireMessage),
        ...(request.tools?.length ? { tools: request.tools.map(toWireTool) } : {}),
      }),
      signal,
    });
    if (!response.ok) {
      // The body is not read or kept: it can echo the prompt.
      void response.body?.cancel().catch(() => undefined);
      throw new LlmError({ kind: "http", message: `HTTP ${response.status}`, status: response.status });
    }
    if (!response.body) throw new LlmError({ kind: "parse", message: "response has no body" });
    yield* parseChatCompletionStream(readSseData(iterateBody(response.body)));
  } catch (error) {
    throw toLlmError(error);
  }
}

/** OpenAI Chat Completions on `fetch` (Workers-compatible). Nothing is logged: no prompts, no keys. */
export const createOpenAiLlm = (config: LlmConfig): Llm => {
  const model = resolveLlmModel(config.model);
  return { model, stream: (request) => streamChat(config, model, request) };
};
