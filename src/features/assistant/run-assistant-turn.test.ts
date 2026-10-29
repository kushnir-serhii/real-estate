import { beforeEach, describe, expect, it, vi } from "vitest";

import { LlmError } from "@/lib/llm/errors";
import type { Llm, LlmEvent } from "@/lib/llm/types";

import type { AssistantEvent } from "./assistant-events";

const db = vi.hoisted(() => ({
  getConversation: vi.fn(),
  createConversation: vi.fn(),
  getConversationMessages: vi.fn(),
  appendMessages: vi.fn(),
  addConversationUsage: vi.fn(),
  getPropertyBySlug: vi.fn(),
}));

vi.mock("@/lib/db/assistant", () => ({
  getConversation: db.getConversation,
  createConversation: db.createConversation,
  getConversationMessages: db.getConversationMessages,
  appendMessages: db.appendMessages,
  addConversationUsage: db.addConversationUsage,
}));
vi.mock("@/lib/db/properties", () => ({ getPropertyBySlug: db.getPropertyBySlug }));

import { runAssistantTurn } from "./run-assistant-turn";

const NEW_ID = "7d6a1f0e-3c1b-4a53-9d2f-0a1b2c3d4e5f";

const llmOf = (events: LlmEvent[], failWith?: LlmError): Llm & { requests: unknown[] } => {
  const requests: unknown[] = [];
  return {
    model: "gpt-4o-mini",
    requests,
    stream: (request) => {
      requests.push(request);
      return (async function* () {
        for (const event of events) yield event;
        if (failWith) throw failWith;
      })();
    },
  };
};

const collect = async (source: AsyncIterable<AssistantEvent>): Promise<AssistantEvent[]> => {
  const out: AssistantEvent[] = [];
  for await (const event of source) out.push(event);
  return out;
};

beforeEach(() => {
  vi.clearAllMocks();
  db.getConversation.mockResolvedValue(null);
  db.createConversation.mockResolvedValue({ id: NEW_ID });
  db.getConversationMessages.mockResolvedValue([]);
  db.appendMessages.mockResolvedValue(undefined);
  db.addConversationUsage.mockResolvedValue(undefined);
  db.getPropertyBySlug.mockResolvedValue(null);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("runAssistantTurn", () => {
  it("starts a new conversation for an unknown id, streams the reply and stores messages and cost", async () => {
    const llm = llmOf([
      { type: "text", delta: "Привіт" },
      { type: "text", delta: "!" },
      { type: "finish", reason: "stop" },
      { type: "usage", usage: { inputTokens: 1_000_000, outputTokens: 0 } },
    ]);
    const events = await collect(
      runAssistantTurn({ conversationId: NEW_ID, message: "Хочу квартиру", pageUrl: "/catalog" }, { llm }),
    );

    expect(events).toEqual([
      { type: "conversation", id: NEW_ID },
      { type: "text", delta: "Привіт" },
      { type: "text", delta: "!" },
      { type: "done" },
    ]);
    expect(db.createConversation).toHaveBeenCalledWith({ pageUrl: "/catalog", propertyId: null });
    expect(db.appendMessages).toHaveBeenNthCalledWith(1, NEW_ID, [{ role: "user", content: "Хочу квартиру" }]);
    expect(db.appendMessages).toHaveBeenNthCalledWith(2, NEW_ID, [{ role: "assistant", content: "Привіт!" }]);
    expect(db.addConversationUsage).toHaveBeenCalledWith(NEW_ID, {
      inputTokens: 1_000_000,
      outputTokens: 0,
      costUsd: 0.15,
    });
  });

  it("continues an existing conversation from the stored history, capped, never from the client", async () => {
    db.getConversation.mockResolvedValue({ id: NEW_ID });
    db.getConversationMessages.mockResolvedValue([
      { role: "user", content: "Купити" },
      { role: "assistant", content: "Яку квартиру?" },
    ]);
    const llm = llmOf([{ type: "text", delta: "ok" }]);
    await collect(runAssistantTurn({ conversationId: NEW_ID, message: "Двокімнатну" }, { llm }));

    expect(db.createConversation).not.toHaveBeenCalled();
    expect(db.getConversationMessages).toHaveBeenCalledWith(NEW_ID, 20);
    const request = llm.requests[0] as { messages: { role: string; content: string }[] };
    expect(request.messages.map((m) => m.role)).toEqual(["system", "user", "assistant", "user"]);
    expect(request.messages.at(-1)?.content).toBe("Двокімнатну");
  });

  it("uses a published property as context and stores its id; ignores a sold one", async () => {
    db.getPropertyBySlug.mockResolvedValue({
      kind: "published",
      property: {
        id: "prop-1",
        slug: "x",
        title: "Особлива квартира",
        deal: "sell",
        property_type: "flat",
        price_amount: 1,
        currency: "USD",
        room_count: 1,
        district: null,
      },
    });
    const llm = llmOf([]);
    await collect(runAssistantTurn({ message: "Hi", propertySlug: "x" }, { llm }));
    expect(db.createConversation).toHaveBeenCalledWith({ pageUrl: null, propertyId: "prop-1" });
    expect(JSON.stringify(llm.requests[0])).toContain("Особлива квартира");

    db.getPropertyBySlug.mockResolvedValue({ kind: "sold", property: { id: "prop-2", title: "Проданий" } });
    const llm2 = llmOf([]);
    await collect(runAssistantTurn({ message: "Hi", propertySlug: "y" }, { llm: llm2 }));
    expect(JSON.stringify(llm2.requests[0])).not.toContain("Проданий");
  });

  it("emits a fixed error event on an LLM failure, keeps the user message and ends with done", async () => {
    const llm = llmOf([], new LlmError({ kind: "http", message: "HTTP 500", status: 500 }));
    const events = await collect(runAssistantTurn({ message: "Секрет" }, { llm }));

    expect(events.map((e) => e.type)).toEqual(["conversation", "error", "done"]);
    const error = events[1];
    expect(error?.type === "error" && error.message).not.toContain("500");
    expect(db.appendMessages).toHaveBeenCalledWith(NEW_ID, [{ role: "user", content: "Секрет" }]);
    expect(db.appendMessages).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("Секрет");
  });

  it("reports a storage failure as an error without calling the model", async () => {
    db.createConversation.mockRejectedValue(new Error("db down"));
    const llm = llmOf([]);
    const events = await collect(runAssistantTurn({ message: "Hi" }, { llm }));
    expect(events.map((e) => e.type)).toEqual(["error", "done"]);
    expect(llm.requests).toHaveLength(0);
  });
});
