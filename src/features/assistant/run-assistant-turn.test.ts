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
  markConversationTurnstileOk: vi.fn(),
  findUserMessageByClientId: vi.fn(),
  countUserMessages: vi.fn(),
  countUserMessagesByIp: vi.fn(),
  getMonthCostUsd: vi.fn(),
  addMonthlyUsage: vi.fn(),
  verifyTurnstile: vi.fn(),
  runAssistantTool: vi.fn(),
}));

vi.mock("@/lib/db/assistant", () => ({
  getConversation: db.getConversation,
  createConversation: db.createConversation,
  getConversationMessages: db.getConversationMessages,
  appendMessages: db.appendMessages,
  addConversationUsage: db.addConversationUsage,
  markConversationTurnstileOk: db.markConversationTurnstileOk,
  findUserMessageByClientId: db.findUserMessageByClientId,
  countUserMessages: db.countUserMessages,
  countUserMessagesByIp: db.countUserMessagesByIp,
  getMonthCostUsd: db.getMonthCostUsd,
  addMonthlyUsage: db.addMonthlyUsage,
}));
vi.mock("@/lib/turnstile", () => ({ verifyTurnstile: db.verifyTurnstile }));
vi.mock("@/lib/db/properties", () => ({ getPropertyBySlug: db.getPropertyBySlug }));
vi.mock("./assistant-tools", () => ({
  ASSISTANT_TOOLS: [{ name: "search_properties", description: "d", parameters: {} }],
  runAssistantTool: db.runAssistantTool,
}));

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
  db.markConversationTurnstileOk.mockResolvedValue(undefined);
  db.findUserMessageByClientId.mockResolvedValue(null);
  db.countUserMessages.mockResolvedValue(0);
  db.countUserMessagesByIp.mockResolvedValue(0);
  db.getMonthCostUsd.mockResolvedValue(0);
  db.addMonthlyUsage.mockResolvedValue(undefined);
  db.verifyTurnstile.mockResolvedValue(true);
  db.runAssistantTool.mockResolvedValue({ content: '{"total":0,"shown":0,"items":[]}' });
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
    expect(db.createConversation).toHaveBeenCalledWith({
      pageUrl: "/catalog",
      propertyId: null,
      ipHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      turnstileOk: true,
    });
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
    expect(db.createConversation).toHaveBeenCalledWith({
      pageUrl: null,
      propertyId: "prop-1",
      ipHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      turnstileOk: true,
    });
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

  describe("limits (slice 4)", () => {
    const okLlm = () => llmOf([{ type: "text", delta: "Ок" }, { type: "finish", reason: "stop" }]);
    const existing = { id: NEW_ID, turnstile_ok: true };
    const CLIENT_ID = "1b2c3d4e-5f60-4a71-8b92-a3b4c5d6e7f8";

    it("a 1001-char message gets message_too_long and never reaches the model or stores anything", async () => {
      const llm = okLlm();
      const events = await collect(runAssistantTurn({ message: "a".repeat(1001) }, { llm }));
      expect(events).toEqual([{ type: "limit", reason: "message_too_long" }, { type: "done" }]);
      expect(llm.requests).toHaveLength(0);
      expect(db.createConversation).not.toHaveBeenCalled();
      expect(db.appendMessages).not.toHaveBeenCalled();
    });

    it("the 21st message in the window from one IP gets rate_limit (the query gets a hash, not the IP)", async () => {
      db.getConversation.mockResolvedValue(existing);
      db.countUserMessagesByIp.mockResolvedValue(20);
      const llm = okLlm();
      const events = await collect(
        runAssistantTurn({ conversationId: NEW_ID, message: "Hi", clientIp: "1.2.3.4" }, { llm }),
      );
      expect(events[0]).toEqual({ type: "limit", reason: "rate_limit" });
      expect(llm.requests).toHaveLength(0);
      expect(db.appendMessages).not.toHaveBeenCalled();
      expect(String(db.countUserMessagesByIp.mock.calls[0]?.[0])).toMatch(/^[0-9a-f]{64}$/);
    });

    it("the 31st message in a conversation gets conversation_limit", async () => {
      db.getConversation.mockResolvedValue(existing);
      db.countUserMessages.mockResolvedValue(30);
      const llm = okLlm();
      const events = await collect(runAssistantTurn({ conversationId: NEW_ID, message: "Hi" }, { llm }));
      expect(events).toEqual([{ type: "limit", reason: "conversation_limit" }, { type: "done" }]);
      expect(llm.requests).toHaveLength(0);
    });

    it("a reached monthly budget gets budget", async () => {
      db.getMonthCostUsd.mockResolvedValue(20);
      const llm = okLlm();
      const events = await collect(runAssistantTurn({ message: "Hi" }, { llm }));
      expect(events).toEqual([{ type: "limit", reason: "budget" }, { type: "done" }]);
      expect(llm.requests).toHaveLength(0);
      expect(db.createConversation).not.toHaveBeenCalled();
    });

    it("a failed Turnstile check refuses a new conversation and stores nothing", async () => {
      db.verifyTurnstile.mockResolvedValue(false);
      const llm = okLlm();
      const events = await collect(
        runAssistantTurn({ message: "Hi", turnstileToken: "bad", clientIp: "1.2.3.4" }, { llm }),
      );
      expect(events).toEqual([{ type: "limit", reason: "turnstile" }, { type: "done" }]);
      expect(db.verifyTurnstile).toHaveBeenCalledWith("bad", "1.2.3.4");
      expect(db.createConversation).not.toHaveBeenCalled();
      expect(db.appendMessages).not.toHaveBeenCalled();
      expect(llm.requests).toHaveLength(0);
    });

    it("a passed Turnstile check creates the conversation checked, with an IP hash and no raw IP", async () => {
      await collect(runAssistantTurn({ message: "Hi", turnstileToken: "good", clientIp: "1.2.3.4" }, { llm: okLlm() }));
      const created = db.createConversation.mock.calls[0]?.[0] as { ipHash: string; turnstileOk: boolean };
      expect(created.turnstileOk).toBe(true);
      expect(created.ipHash).toMatch(/^[0-9a-f]{64}$/);
      expect(JSON.stringify(created)).not.toContain("1.2.3.4");
    });

    it("an existing unchecked conversation is checked and marked", async () => {
      db.getConversation.mockResolvedValue({ id: NEW_ID, turnstile_ok: false });
      await collect(
        runAssistantTurn({ conversationId: NEW_ID, message: "Hi", turnstileToken: "good" }, { llm: okLlm() }),
      );
      expect(db.markConversationTurnstileOk).toHaveBeenCalledWith(NEW_ID, expect.stringMatching(/^[0-9a-f]{64}$/));
    });

    it("a checked conversation needs no token", async () => {
      db.getConversation.mockResolvedValue(existing);
      await collect(runAssistantTurn({ conversationId: NEW_ID, message: "Hi" }, { llm: okLlm() }));
      expect(db.verifyTurnstile).not.toHaveBeenCalled();
      expect(db.markConversationTurnstileOk).not.toHaveBeenCalled();
    });

    it("stores client_message_id with the visitor message", async () => {
      await collect(runAssistantTurn({ message: "Hi", clientMessageId: CLIENT_ID }, { llm: okLlm() }));
      expect(db.appendMessages.mock.calls[0]?.[1]).toEqual([
        { role: "user", content: "Hi", client_message_id: CLIENT_ID },
      ]);
    });

    it("a retry with a stored client_message_id is not stored again, skips message caps, answers from earlier history", async () => {
      db.getConversation.mockResolvedValue(existing);
      db.findUserMessageByClientId.mockResolvedValue({ id: "m2", created_at: "2026-11-04T10:00:02.000Z" });
      db.countUserMessagesByIp.mockResolvedValue(99);
      db.countUserMessages.mockResolvedValue(99);
      db.getConversationMessages.mockResolvedValue([
        { id: "m0", role: "user", content: "Раніше", data: null, created_at: "2026-11-04T10:00:00.000Z" },
        { id: "m1", role: "assistant", content: "Відповідь", data: null, created_at: "2026-11-04T10:00:01.000Z" },
        { id: "m2", role: "user", content: "Hi", data: null, created_at: "2026-11-04T10:00:02.000Z" },
      ]);
      const llm = okLlm();
      const events = await collect(
        runAssistantTurn({ conversationId: NEW_ID, message: "Hi", clientMessageId: CLIENT_ID }, { llm }),
      );
      expect(events.map((e) => e.type)).toEqual(["conversation", "text", "done"]);
      const stored = db.appendMessages.mock.calls.flatMap((call) => call[1] as { role: string }[]);
      expect(stored.every((row) => row.role !== "user")).toBe(true);
      const request = llm.requests[0] as { messages: { role: string; content: string }[] };
      expect(request.messages.filter((m) => m.content === "Hi")).toHaveLength(1);
      expect(request.messages.map((m) => m.role)).toEqual(["system", "user", "assistant", "user"]);
    });

    it("adds the turn's usage to the conversation and to the month's counter", async () => {
      const llm = llmOf([
        { type: "text", delta: "Ок" },
        { type: "usage", usage: { inputTokens: 1_000_000, outputTokens: 1_000_000 } },
      ]);
      await collect(runAssistantTurn({ message: "Hi" }, { llm }));
      const expected = { inputTokens: 1_000_000, outputTokens: 1_000_000, costUsd: 0.75 };
      expect(db.addConversationUsage).toHaveBeenCalledWith(NEW_ID, expected);
      expect(db.addMonthlyUsage).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-01$/), expected);
    });
  });
});
