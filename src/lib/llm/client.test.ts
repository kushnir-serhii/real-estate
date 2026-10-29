import { describe, expect, it } from "vitest";

import { createOpenAiLlm } from "./client";
import { isLlmError } from "./errors";
import { costUsd } from "./pricing";
import type { LlmEvent, LlmRequest } from "./types";

const collect = async (source: AsyncIterable<LlmEvent>): Promise<LlmEvent[]> => {
  const out: LlmEvent[] = [];
  for await (const item of source) out.push(item);
  return out;
};

const KEY = "sk-secret-key";
const request: LlmRequest = { messages: [{ role: "user", content: "secret prompt" }] };

type Sent = { headers: Headers; body: { messages: unknown[]; tools?: unknown[] } & Record<string, unknown> };

const capture = (response: () => Response) => {
  const sent: Sent[] = [];
  const fetchStub: typeof fetch = async (_url, init) => {
    sent.push({ headers: new Headers(init?.headers), body: JSON.parse(String(init?.body)) });
    return response();
  };
  return { sent, fetchStub };
};

describe("createOpenAiLlm", () => {
  it("sends a streaming request with usage and tools, and streams events back", async () => {
    const { sent, fetchStub } = capture(
      () => new Response('data: {"choices":[{"delta":{"content":"Hi"},"finish_reason":null}]}\n\ndata: [DONE]\n\n'),
    );
    const llm = createOpenAiLlm({ apiKey: KEY, fetch: fetchStub });
    const events = await collect(
      llm.stream({ ...request, tools: [{ name: "t", description: "d", parameters: { type: "object" } }] }),
    );
    expect(events).toEqual([{ type: "text", delta: "Hi" }]);
    expect(llm.model).toBe("gpt-4o-mini");
    expect(sent[0]?.headers.get("authorization")).toBe(`Bearer ${KEY}`);
    expect(sent[0]?.body).toMatchObject({ stream: true, stream_options: { include_usage: true }, model: "gpt-4o-mini" });
    expect(sent[0]?.body.tools).toEqual([
      { type: "function", function: { name: "t", description: "d", parameters: { type: "object" } } },
    ]);
  });

  it("throws an http error without the key or the prompt", async () => {
    const fetchStub: typeof fetch = async () =>
      new Response(`{"error":"bad key ${KEY} secret prompt"}`, { status: 401 });
    const error = await collect(createOpenAiLlm({ apiKey: KEY, fetch: fetchStub }).stream(request)).catch(
      (e: unknown) => e,
    );
    expect(isLlmError(error) && error.kind === "http").toBe(true);
    expect(String(error)).toBe("LlmError: LLM http: HTTP 401");
  });

  it("maps network failures and timeouts to typed errors", async () => {
    const down: typeof fetch = async () => {
      throw new TypeError(`fetch failed for ${KEY}`);
    };
    const slow: typeof fetch = async (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      });
    const network = await collect(createOpenAiLlm({ apiKey: KEY, fetch: down }).stream(request)).catch(
      (e: unknown) => e,
    );
    const timeout = await collect(createOpenAiLlm({ apiKey: KEY, fetch: slow, timeoutMs: 20 }).stream(request)).catch(
      (e: unknown) => e,
    );
    expect(isLlmError(network) && network.kind).toBe("network");
    expect(String(network)).not.toContain(KEY);
    expect(isLlmError(timeout) && timeout.kind).toBe("timeout");
  });

  it("serializes assistant tool calls and tool results", async () => {
    const { sent, fetchStub } = capture(() => new Response("data: [DONE]\n\n"));
    await collect(
      createOpenAiLlm({ apiKey: KEY, fetch: fetchStub }).stream({
        messages: [
          { role: "assistant", content: "", toolCalls: [{ id: "c1", name: "search_properties", arguments: "{}" }] },
          { role: "tool", toolCallId: "c1", content: "[]" },
        ],
      }),
    );
    expect(sent[0]?.body.messages).toEqual([
      {
        role: "assistant",
        content: null,
        tool_calls: [{ id: "c1", type: "function", function: { name: "search_properties", arguments: "{}" } }],
      },
      { role: "tool", tool_call_id: "c1", content: "[]" },
    ]);
  });
});

describe("costUsd", () => {
  it("prices gpt-4o-mini per 1M tokens", () => {
    expect(costUsd("gpt-4o-mini", { inputTokens: 1_000_000, outputTokens: 1_000_000 })).toBeCloseTo(0.75);
    expect(costUsd("gpt-4o-mini", { inputTokens: 2000, outputTokens: 500 })).toBeCloseTo(0.0006);
  });

  it("costs nothing for the fixture and uses the highest known price for unknown models", () => {
    expect(costUsd("fixture", { inputTokens: 0, outputTokens: 0 })).toBe(0);
    expect(costUsd("future-model", { inputTokens: 1_000_000, outputTokens: 0 })).toBe(2.5);
  });
});
