import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Llm, LlmEvent, LlmMessage, LlmRequest } from "@/lib/llm/types";

import type { AssistantEvent } from "./assistant-events";

const db = vi.hoisted(() => ({
  getConversation: vi.fn(),
  createConversation: vi.fn(),
  getConversationMessages: vi.fn(),
  appendMessages: vi.fn(),
  addConversationUsage: vi.fn(),
  getPropertyBySlug: vi.fn(),
  runAssistantTool: vi.fn(),
}));

vi.mock("@/lib/db/assistant", () => ({
  getConversation: db.getConversation,
  createConversation: db.createConversation,
  getConversationMessages: db.getConversationMessages,
  appendMessages: db.appendMessages,
  addConversationUsage: db.addConversationUsage,
}));
vi.mock("@/lib/db/properties", () => ({ getPropertyBySlug: db.getPropertyBySlug }));
vi.mock("./assistant-tools", () => ({
  ASSISTANT_TOOLS: [{ name: "search_properties", description: "d", parameters: {} }],
  runAssistantTool: db.runAssistantTool,
}));

import { MAX_TOOL_ROUNDS, runAssistantTurn } from "./run-assistant-turn";

const NEW_ID = "7d6a1f0e-3c1b-4a53-9d2f-0a1b2c3d4e5f";

/** One scripted reply per LLM call; the last one repeats when the loop asks for more. */
const roundsOf = (rounds: LlmEvent[][]): Llm & { requests: LlmRequest[] } => {
  const requests: LlmRequest[] = [];
  return {
    model: "gpt-4o-mini",
    requests,
    stream: (request) => {
      // Snapshot: the loop keeps appending to the same messages array.
      requests.push({ ...request, messages: [...request.messages] });
      const events = rounds[Math.min(requests.length - 1, rounds.length - 1)] ?? [];
      return (async function* () {
        for (const event of events) yield event;
      })();
    },
  };
};

const searchCall = (id: string, args = "{}"): LlmEvent => ({
  type: "tool_call",
  call: { id, name: "search_properties", arguments: args },
});

const collect = async (source: AsyncIterable<AssistantEvent>): Promise<AssistantEvent[]> => {
  const out: AssistantEvent[] = [];
  for await (const event of source) out.push(event);
  return out;
};

const propertiesEvent: AssistantEvent = { type: "properties", items: [], total: 7, catalog_url: "/catalog?deal=sell" };

beforeEach(() => {
  vi.clearAllMocks();
  db.getConversation.mockResolvedValue(null);
  db.createConversation.mockResolvedValue({ id: NEW_ID });
  db.getConversationMessages.mockResolvedValue([]);
  db.appendMessages.mockResolvedValue(undefined);
  db.addConversationUsage.mockResolvedValue(undefined);
  db.getPropertyBySlug.mockResolvedValue(null);
  db.runAssistantTool.mockResolvedValue({ content: '{"total":0,"shown":0,"items":[]}' });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("runAssistantTurn tool loop", () => {
  it("runs a tool call, emits the properties event, calls the model again and stores everything", async () => {
    db.runAssistantTool.mockResolvedValue({ content: '{"total":7}', event: propertiesEvent });
    const llm = roundsOf([
      [
        { type: "text", delta: "Шукаю." },
        searchCall("call_1", '{"deal":"buy"}'),
        { type: "finish", reason: "tool_calls" },
        { type: "usage", usage: { inputTokens: 100, outputTokens: 10 } },
      ],
      [
        { type: "text", delta: "Є 7 варіантів." },
        { type: "finish", reason: "stop" },
        { type: "usage", usage: { inputTokens: 200, outputTokens: 20 } },
      ],
    ]);
    const events = await collect(runAssistantTurn({ message: "Хочу купити" }, { llm }));

    expect(events).toEqual([
      { type: "conversation", id: NEW_ID },
      { type: "text", delta: "Шукаю." },
      propertiesEvent,
      { type: "text", delta: "Є 7 варіантів." },
      { type: "done" },
    ]);
    expect(db.runAssistantTool).toHaveBeenCalledWith(
      { id: "call_1", name: "search_properties", arguments: '{"deal":"buy"}' },
      { conversationId: NEW_ID },
    );
    expect(llm.requests[0]?.tools?.map((t) => t.name)).toEqual(["search_properties"]);

    const second: LlmMessage[] = llm.requests[1]?.messages ?? [];
    expect(second.slice(-3)).toEqual([
      { role: "user", content: "Хочу купити" },
      {
        role: "assistant",
        content: "Шукаю.",
        toolCalls: [{ id: "call_1", name: "search_properties", arguments: '{"deal":"buy"}' }],
      },
      { role: "tool", toolCallId: "call_1", content: '{"total":7}' },
    ]);

    expect(db.appendMessages).toHaveBeenNthCalledWith(2, NEW_ID, [
      {
        role: "assistant",
        content: "Шукаю.",
        data: { tool_calls: [{ id: "call_1", name: "search_properties", arguments: '{"deal":"buy"}' }] },
      },
      { role: "tool", content: '{"total":7}', data: { tool_call_id: "call_1", name: "search_properties" } },
      { role: "assistant", content: "Є 7 варіантів." },
    ]);
    // Usage is summed over both rounds and saved once.
    expect(db.addConversationUsage).toHaveBeenCalledTimes(1);
    expect(db.addConversationUsage).toHaveBeenCalledWith(
      NEW_ID,
      expect.objectContaining({ inputTokens: 300, outputTokens: 30 }),
    );
  });

  it("stops offering tools after the maximum number of rounds", async () => {
    const llm = roundsOf([
      [searchCall("c1")],
      [searchCall("c2")],
      [searchCall("c3")],
      [{ type: "text", delta: "Ось." }],
    ]);
    const events = await collect(runAssistantTurn({ message: "Шукай" }, { llm }));

    expect(llm.requests).toHaveLength(MAX_TOOL_ROUNDS + 1);
    expect(llm.requests.slice(0, MAX_TOOL_ROUNDS).every((r) => r.tools?.length === 1)).toBe(true);
    expect(llm.requests[MAX_TOOL_ROUNDS]?.tools).toBeUndefined();
    expect(db.runAssistantTool).toHaveBeenCalledTimes(MAX_TOOL_ROUNDS);
    expect(events.at(-2)).toEqual({ type: "text", delta: "Ось." });
  });

  it("ignores tool calls the model still makes once tools are withheld", async () => {
    const llm = roundsOf([[searchCall("c1")], [searchCall("c2")], [searchCall("c3")], [searchCall("c4")]]);
    const events = await collect(runAssistantTurn({ message: "Шукай" }, { llm }));
    expect(db.runAssistantTool).toHaveBeenCalledTimes(MAX_TOOL_ROUNDS);
    expect(llm.requests).toHaveLength(MAX_TOOL_ROUNDS + 1);
    expect(events.at(-1)).toEqual({ type: "done" });
  });

  it("hands an unknown tool to the runner and feeds its error result back to the model", async () => {
    db.runAssistantTool.mockResolvedValue({ content: '{"error":"unknown_tool"}' });
    const llm = roundsOf([
      [{ type: "tool_call", call: { id: "x", name: "drop_tables", arguments: "{}" } }],
      [{ type: "text", delta: "Вибачте." }],
    ]);
    const events = await collect(runAssistantTurn({ message: "Hi" }, { llm }));
    expect(events.map((e) => e.type)).toEqual(["conversation", "text", "done"]);
    const second: LlmMessage[] = llm.requests[1]?.messages ?? [];
    expect(second.at(-1)).toEqual({ role: "tool", toolCallId: "x", content: '{"error":"unknown_tool"}' });
  });

  it("sends valid OpenAI history on the next turn: tool call, its result, then the answer", async () => {
    db.getConversation.mockResolvedValue({ id: NEW_ID });
    db.getConversationMessages.mockResolvedValue([
      { role: "user", content: "Купити", data: null },
      {
        role: "assistant",
        content: "",
        data: { tool_calls: [{ id: "call_1", name: "search_properties", arguments: "{}" }] },
      },
      { role: "tool", content: '{"total":7}', data: { tool_call_id: "call_1", name: "search_properties" } },
      { role: "assistant", content: "Є 7 варіантів.", data: null },
    ]);
    const llm = roundsOf([[{ type: "text", delta: "ok" }]]);
    await collect(runAssistantTurn({ conversationId: NEW_ID, message: "Дякую" }, { llm }));

    const sent = llm.requests[0]?.messages ?? [];
    expect(sent.map((m) => m.role)).toEqual(["system", "user", "assistant", "tool", "assistant", "user"]);
    expect(sent[2]).toMatchObject({ role: "assistant", toolCalls: [{ id: "call_1" }] });
    expect(sent[3]).toMatchObject({ role: "tool", toolCallId: "call_1" });
  });

  it("drops an orphaned tool row at the start of the limited history", async () => {
    db.getConversation.mockResolvedValue({ id: NEW_ID });
    db.getConversationMessages.mockResolvedValue([
      { role: "tool", content: '{"total":7}', data: { tool_call_id: "call_1", name: "search_properties" } },
      { role: "assistant", content: "Є 7 варіантів.", data: null },
    ]);
    const llm = roundsOf([[{ type: "text", delta: "ok" }]]);
    await collect(runAssistantTurn({ conversationId: NEW_ID, message: "Дякую" }, { llm }));
    expect((llm.requests[0]?.messages ?? []).map((m) => m.role)).toEqual(["system", "assistant", "user"]);
  });
});
