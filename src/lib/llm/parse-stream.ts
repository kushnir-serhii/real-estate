import { z } from "zod";

import { LlmError } from "./errors";
import type { LlmEvent, LlmFinishReason, LlmToolCall } from "./types";

const EOL = /\r\n|\n|\r/;

/**
 * Splits an SSE byte/text stream into `data:` payloads. Robust to chunks that cut a line (or a UTF-8
 * character) in half, to CRLF, comments and other fields. Ends at the stream end; `[DONE]` is yielded as is.
 */
export async function* readSseData(source: AsyncIterable<Uint8Array | string>): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  let buffer = "";
  let data: string[] = [];

  /** Returns a finished event's payload when the line is the blank separator. */
  const handleLine = (line: string): string | null => {
    if (line === "") {
      if (data.length === 0) return null;
      const payload = data.join("\n");
      data = [];
      return payload;
    }
    if (line.startsWith(":")) return null;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    if (field !== "data") return null;
    data.push(colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, ""));
    return null;
  };

  for await (const chunk of source) {
    buffer += typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });
    let newline = buffer.search(EOL);
    while (newline !== -1) {
      // A lone «\r» at the very end may be the first half of «\r\n»: wait for the next chunk.
      if (buffer[newline] === "\r" && newline === buffer.length - 1) break;
      const eol = buffer.startsWith("\r\n", newline) ? 2 : 1;
      const payload = handleLine(buffer.slice(0, newline));
      buffer = buffer.slice(newline + eol);
      if (payload !== null) yield payload;
      newline = buffer.search(EOL);
    }
  }
  buffer += decoder.decode();
  if (buffer !== "") {
    const payload = handleLine(buffer.replace(/\r$/, ""));
    if (payload !== null) yield payload;
  }
  if (data.length > 0) yield data.join("\n");
}

const chunkSchema = z.object({
  choices: z
    .array(
      z.object({
        delta: z
          .object({
            content: z.string().nullish(),
            tool_calls: z
              .array(
                z.object({
                  index: z.number().int().nonnegative(),
                  id: z.string().nullish(),
                  function: z.object({ name: z.string().nullish(), arguments: z.string().nullish() }).nullish(),
                }),
              )
              .nullish(),
          })
          .default({}),
        finish_reason: z.string().nullish(),
      }),
    )
    .default([]),
  usage: z.object({ prompt_tokens: z.number(), completion_tokens: z.number() }).nullish(),
});

const FINISH_REASONS: readonly LlmFinishReason[] = ["stop", "length", "tool_calls", "content_filter"];

const toFinishReason = (value: string): LlmFinishReason =>
  FINISH_REASONS.find((reason) => reason === value) ?? "other";

/**
 * Turns Chat Completions `data:` payloads into typed events. Tool call deltas (split across chunks by
 * `index`) are assembled and emitted whole when the model finishes; usage comes from the last chunk.
 */
export async function* parseChatCompletionStream(payloads: AsyncIterable<string>): AsyncGenerator<LlmEvent> {
  const pending = new Map<number, LlmToolCall>();

  const flush = function* (): Generator<LlmEvent> {
    const ordered = [...pending.entries()].sort(([a], [b]) => a - b);
    pending.clear();
    for (const [, call] of ordered) yield { type: "tool_call", call };
  };

  for await (const payload of payloads) {
    if (payload.trim() === "[DONE]") break;
    let json: unknown;
    try {
      json = JSON.parse(payload);
    } catch {
      throw new LlmError({ kind: "parse", message: "stream chunk is not valid JSON" });
    }
    const parsed = chunkSchema.safeParse(json);
    if (!parsed.success) throw new LlmError({ kind: "parse", message: "stream chunk has an unexpected shape" });

    for (const choice of parsed.data.choices) {
      const delta = choice.delta;
      if (delta.content) yield { type: "text", delta: delta.content };
      for (const part of delta.tool_calls ?? []) {
        const call = pending.get(part.index) ?? { id: "", name: "", arguments: "" };
        if (part.id) call.id = part.id;
        if (part.function?.name) call.name += part.function.name;
        if (part.function?.arguments) call.arguments += part.function.arguments;
        pending.set(part.index, call);
      }
      if (choice.finish_reason) {
        yield* flush();
        yield { type: "finish", reason: toFinishReason(choice.finish_reason) };
      }
    }
    if (parsed.data.usage) {
      yield* flush();
      yield {
        type: "usage",
        usage: { inputTokens: parsed.data.usage.prompt_tokens, outputTokens: parsed.data.usage.completion_tokens },
      };
    }
  }
  yield* flush();
}
