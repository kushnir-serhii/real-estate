import { describe, expect, it } from "vitest";

import { isLlmError } from "./errors";
import { parseChatCompletionStream, readSseData } from "./parse-stream";
import type { LlmEvent } from "./types";

async function* from<T>(items: readonly T[]): AsyncGenerator<T> {
  for (const item of items) yield item;
}

const collect = async <T>(source: AsyncIterable<T>): Promise<T[]> => {
  const out: T[] = [];
  for await (const item of source) out.push(item);
  return out;
};

const sse = (...payloads: unknown[]): string =>
  payloads.map((p) => `data: ${typeof p === "string" ? p : JSON.stringify(p)}\n\n`).join("");

const choice = (delta: object, finish: string | null = null) => ({ choices: [{ delta, finish_reason: finish }] });

const parse = (text: string, chunkSize = text.length): Promise<LlmEvent[]> => {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) chunks.push(text.slice(i, i + chunkSize));
  return collect(parseChatCompletionStream(readSseData(from(chunks))));
};

describe("readSseData", () => {
  it("yields data payloads, ignores comments and other fields", async () => {
    const payloads = await collect(readSseData(from([": ping\n\nevent: x\ndata: a\n\ndata: b\n\n"])));
    expect(payloads).toEqual(["a", "b"]);
  });

  it("handles lines split mid-way, one byte at a time, and CRLF", async () => {
    const text = "data: hello\r\n\r\ndata: [DONE]\r\n\r\n";
    const bytes = [...new TextEncoder().encode(text)].map((b) => new Uint8Array([b]));
    expect(await collect(readSseData(from(bytes)))).toEqual(["hello", "[DONE]"]);
  });

  it("does not break a multi-byte character split across chunks", async () => {
    const bytes = new TextEncoder().encode("data: Привіт\n\n");
    const parts = [bytes.slice(0, 8), bytes.slice(8)];
    expect(await collect(readSseData(from(parts)))).toEqual(["Привіт"]);
  });

  it("flushes a last event without the trailing blank line", async () => {
    expect(await collect(readSseData(from(["data: tail"])))).toEqual(["tail"]);
  });
});

describe("parseChatCompletionStream", () => {
  it("emits text deltas, finish and usage, stops at [DONE]", async () => {
    const text = sse(
      choice({ role: "assistant", content: "" }),
      choice({ content: "При" }),
      choice({ content: "віт" }),
      choice({}, "stop"),
      { choices: [], usage: { prompt_tokens: 12, completion_tokens: 3 } },
      "[DONE]",
      choice({ content: "ignored" }),
    );
    expect(await parse(text)).toEqual([
      { type: "text", delta: "При" },
      { type: "text", delta: "віт" },
      { type: "finish", reason: "stop" },
      { type: "usage", usage: { inputTokens: 12, outputTokens: 3 } },
    ]);
  });

  it("gives the same events however the bytes are chunked", async () => {
    const text = sse(choice({ content: "a" }), choice({ content: "b" }, "length"), "[DONE]");
    const whole = await parse(text);
    expect(await parse(text, 3)).toEqual(whole);
    expect(whole).toEqual([
      { type: "text", delta: "a" },
      { type: "text", delta: "b" },
      { type: "finish", reason: "length" },
    ]);
  });

  it("assembles tool call deltas across chunks, several calls by index", async () => {
    const text = sse(
      choice({
        tool_calls: [{ index: 0, id: "call_1", type: "function", function: { name: "search_properties", arguments: "" } }],
      }),
      choice({ tool_calls: [{ index: 0, function: { arguments: '{"deal":' } }] }),
      choice({ tool_calls: [{ index: 1, id: "call_2", function: { name: "propose_lead", arguments: "{}" } }] }),
      choice({ tool_calls: [{ index: 0, function: { arguments: '"buy"}' } }] }),
      choice({}, "tool_calls"),
      { choices: [], usage: { prompt_tokens: 100, completion_tokens: 20 } },
      "[DONE]",
    );
    expect(await parse(text, 7)).toEqual([
      { type: "tool_call", call: { id: "call_1", name: "search_properties", arguments: '{"deal":"buy"}' } },
      { type: "tool_call", call: { id: "call_2", name: "propose_lead", arguments: "{}" } },
      { type: "finish", reason: "tool_calls" },
      { type: "usage", usage: { inputTokens: 100, outputTokens: 20 } },
    ]);
  });

  it("maps an unknown finish reason to other", async () => {
    expect(await parse(sse(choice({}, "weird")))).toEqual([{ type: "finish", reason: "other" }]);
  });

  it("throws a parse error on invalid JSON or an unexpected shape, without echoing the payload", async () => {
    for (const bad of ["not json", JSON.stringify({ choices: "nope" })]) {
      const error = await parse(sse(bad)).catch((e: unknown) => e);
      expect(isLlmError(error) && error.kind === "parse").toBe(true);
      expect(String(error)).not.toContain("nope");
    }
  });
});
