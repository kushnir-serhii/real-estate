/** A tool function the model may call. `parameters` is a JSON Schema object. */
export type LlmToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

/** A complete tool call (arguments are the raw JSON string from the model: validate with zod before use). */
export type LlmToolCall = { id: string; name: string; arguments: string };

export type LlmMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: LlmToolCall[] }
  | { role: "tool"; toolCallId: string; content: string };

export type LlmUsage = { inputTokens: number; outputTokens: number };

export type LlmFinishReason = "stop" | "length" | "tool_calls" | "content_filter" | "other";

export type LlmEvent =
  | { type: "text"; delta: string }
  | { type: "tool_call"; call: LlmToolCall }
  | { type: "finish"; reason: LlmFinishReason }
  | { type: "usage"; usage: LlmUsage };

export type LlmRequest = {
  messages: LlmMessage[];
  tools?: LlmToolDefinition[];
  /** Caller's abort (e.g. the visitor closed the chat). The client adds its own timeout on top. */
  signal?: AbortSignal;
};

/** Real and fixture assistants implement this. Errors surface as `LlmError` while iterating. */
export type Llm = {
  readonly model: string;
  stream: (request: LlmRequest) => AsyncIterable<LlmEvent>;
};
