import "server-only";

import { createOpenAiLlm, isLlmConfigured } from "./client";
import type { LlmConfig } from "./client";
import { createFixtureLlm } from "./fixtures/assistant";
import type { Llm } from "./types";

const configFromEnv = (): LlmConfig => ({
  apiKey: process.env.LLM_API_KEY,
  model: process.env.LLM_MODEL,
});

/** The real OpenAI client when `LLM_API_KEY` is set, otherwise the scripted fixture assistant. Read on every call. */
export const getLlm = (): Llm => {
  const config = configFromEnv();
  return isLlmConfigured(config) ? createOpenAiLlm(config) : createFixtureLlm();
};

export { createOpenAiLlm, isLlmConfigured, resolveLlmModel } from "./client";
export type { LlmConfig } from "./client";
export { isLlmError, LlmError } from "./errors";
export type { LlmErrorDetails, LlmErrorKind } from "./errors";
export { createFixtureLlm } from "./fixtures/assistant";
export { costUsd } from "./pricing";
export type {
  Llm,
  LlmEvent,
  LlmFinishReason,
  LlmMessage,
  LlmRequest,
  LlmToolCall,
  LlmToolDefinition,
  LlmUsage,
} from "./types";
