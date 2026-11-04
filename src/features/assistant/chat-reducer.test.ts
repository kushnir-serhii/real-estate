import { describe, expect, it } from "vitest";

import { ASSISTANT_ERROR_MESSAGE } from "@/constants/assistant";
import type { AssistantPropertyCard } from "./assistant-events";
import { activeReply, chatReducer, findLeadCard, INITIAL_CHAT_STATE, latestLeadCardId, replyText } from "./chat-reducer";
import type { AssistantReply, ChatAction, ChatState } from "./chat-reducer";

const CONVERSATION = "7d6a1f0e-3c1b-4a53-9d2f-0a1b2c3d4e5f";

const CARD: AssistantPropertyCard = {
  slug: "kvartyra-1",
  title: "2-кімнатна квартира",
  price: "85 000 $",
  rooms: 2,
  area_total: 54,
  district: "Центр",
  photo_url: null,
  url: "/catalog/kvartyra-1",
};

const run = (actions: ChatAction[], from: ChatState = INITIAL_CHAT_STATE) => actions.reduce(chatReducer, from);

const sent = run([{ type: "send", userId: "u1", replyId: "r1", text: "Купити" }]);

const reply = (state: ChatState, id: string): AssistantReply => {
  const found = state.messages.find((message) => message.id === id);
  if (found?.role !== "assistant") throw new Error(`no reply ${id}`);
  return found;
};

describe("chatReducer", () => {
  it("adds the visitor message and a waiting reply", () => {
    expect(sent.messages).toEqual([
      { id: "u1", role: "user", text: "Купити" },
      { id: "r1", role: "assistant", parts: [], prompt: "Купити", state: { status: "waiting" } },
    ]);
    expect(activeReply(sent)?.id).toBe("r1");
  });

  it("ignores a second send while a reply is on its way", () => {
    expect(chatReducer(sent, { type: "send", userId: "u2", replyId: "r2", text: "Ще" })).toBe(sent);
  });

  it("streams text, stores the conversation id and finishes on done", () => {
    const state = run(
      [
        { type: "event", replyId: "r1", event: { type: "conversation", id: CONVERSATION } },
        { type: "event", replyId: "r1", event: { type: "text", delta: "Добре, " } },
        { type: "event", replyId: "r1", event: { type: "text", delta: "який район?" } },
        { type: "event", replyId: "r1", event: { type: "done" } },
      ],
      sent,
    );
    expect(state.conversationId).toBe(CONVERSATION);
    expect(reply(state, "r1")).toMatchObject({
      parts: [{ kind: "text", text: "Добре, який район?" }],
      state: { status: "done" },
    });
    expect(activeReply(state)).toBeNull();
  });

  it("marks the reply streaming after the first delta", () => {
    const state = chatReducer(sent, { type: "event", replyId: "r1", event: { type: "text", delta: "Так" } });
    expect(reply(state, "r1").state).toEqual({ status: "streaming" });
  });

  it("turns an error event into a retryable error", () => {
    const state = run(
      [
        { type: "event", replyId: "r1", event: { type: "error", message: "Збій" } },
        { type: "event", replyId: "r1", event: { type: "done" } },
      ],
      sent,
    );
    expect(reply(state, "r1").state).toEqual({ status: "error", message: "Збій" });
  });

  it("treats done without any text as an error", () => {
    const state = chatReducer(sent, { type: "event", replyId: "r1", event: { type: "done" } });
    expect(reply(state, "r1").state).toEqual({ status: "error", message: ASSISTANT_ERROR_MESSAGE });
  });

  it("fails an open reply on a network error, but not a finished one", () => {
    const failed = chatReducer(sent, { type: "fail", replyId: "r1" });
    expect(reply(failed, "r1").state).toEqual({ status: "error", message: ASSISTANT_ERROR_MESSAGE });

    const done = run(
      [
        { type: "event", replyId: "r1", event: { type: "text", delta: "Так" } },
        { type: "event", replyId: "r1", event: { type: "done" } },
      ],
      sent,
    );
    expect(chatReducer(done, { type: "fail", replyId: "r1" })).toBe(done);
  });

  it("retries a failed reply with a fresh id and the same prompt", () => {
    const failed = run(
      [
        { type: "event", replyId: "r1", event: { type: "text", delta: "Част" } },
        { type: "fail", replyId: "r1" },
      ],
      sent,
    );
    const retried = chatReducer(failed, { type: "retry", failedId: "r1", replyId: "r2" });
    expect(retried.messages).toHaveLength(2);
    expect(reply(retried, "r2")).toEqual({
      id: "r2",
      role: "assistant",
      parts: [],
      prompt: "Купити",
      state: { status: "waiting" },
    });
  });

  it("shows the limit state", () => {
    const state = chatReducer(sent, { type: "event", replyId: "r1", event: { type: "limit", reason: "budget" } });
    expect(reply(state, "r1").state).toEqual({ status: "limit", reason: "budget" });
  });

  it("drops late events of an aborted turn", () => {
    const reset = chatReducer(sent, { type: "reset" });
    expect(reset).toEqual(INITIAL_CHAT_STATE);
    expect(
      chatReducer(reset, { type: "event", replyId: "r1", event: { type: "conversation", id: CONVERSATION } }),
    ).toBe(reset);
    expect(chatReducer(reset, { type: "event", replyId: "r1", event: { type: "text", delta: "x" } })).toBe(reset);
  });

  it("keeps property results and text in the order they came", () => {
    const state = run(
      [
        { type: "event", replyId: "r1", event: { type: "properties", items: [CARD], total: 12, catalog_url: "/catalog?deal=sell" } },
        { type: "event", replyId: "r1", event: { type: "text", delta: "Ось " } },
        { type: "event", replyId: "r1", event: { type: "text", delta: "варіанти." } },
        { type: "event", replyId: "r1", event: { type: "properties", items: [], total: 0, catalog_url: "/catalog" } },
        { type: "event", replyId: "r1", event: { type: "text", delta: "Залишите заявку?" } },
        { type: "event", replyId: "r1", event: { type: "done" } },
      ],
      sent,
    );
    expect(reply(state, "r1")).toMatchObject({
      parts: [
        { kind: "properties", items: [CARD], total: 12, catalogUrl: "/catalog?deal=sell" },
        { kind: "text", text: "Ось варіанти." },
        { kind: "properties", items: [], total: 0, catalogUrl: "/catalog" },
        { kind: "text", text: "Залишите заявку?" },
      ],
      state: { status: "done" },
    });
    expect(replyText(reply(state, "r1"))).toBe("Ось варіанти.\n\nЗалишите заявку?");
  });

  it("shows results as soon as they come and finishes a reply that only has results", () => {
    const shown = chatReducer(sent, {
      type: "event",
      replyId: "r1",
      event: { type: "properties", items: [CARD], total: 1, catalog_url: "/catalog" },
    });
    expect(reply(shown, "r1").state).toEqual({ status: "streaming" });
    const done = chatReducer(shown, { type: "event", replyId: "r1", event: { type: "done" } });
    expect(reply(done, "r1").state).toEqual({ status: "done" });
  });

  it("starts a retried reply without the failed one's results", () => {
    const failed = run(
      [
        { type: "event", replyId: "r1", event: { type: "properties", items: [CARD], total: 1, catalog_url: "/catalog" } },
        { type: "fail", replyId: "r1" },
      ],
      sent,
    );
    expect(reply(chatReducer(failed, { type: "retry", failedId: "r1", replyId: "r2" }), "r2").parts).toEqual([]);
  });

  it("drops results that come after the reply finished", () => {
    const done = run(
      [
        { type: "event", replyId: "r1", event: { type: "text", delta: "Так" } },
        { type: "event", replyId: "r1", event: { type: "done" } },
      ],
      sent,
    );
    expect(
      chatReducer(done, {
        type: "event",
        replyId: "r1",
        event: { type: "properties", items: [CARD], total: 1, catalog_url: "/catalog" },
      }),
    ).toBe(done);
  });

  it("ignores a lead card for a finished reply", () => {
    const done = run([{ type: "event", replyId: "r1", event: { type: "done" } }], sent);
    expect(chatReducer(done, { type: "event", replyId: "r1", event: LEAD_EVENT })).toBe(done);
  });
});

const LEAD_EVENT = {
  type: "lead_card",
  proposal_id: "p1",
  prefill: { name: "Олена", phone: "+380671234567" },
  summary: "2-кімнатна на Оболоні до 80 000 $",
} as const;

const withCard = run(
  [
    { type: "event", replyId: "r1", event: { type: "text", delta: "Ось заявка:" } },
    { type: "event", replyId: "r1", event: LEAD_EVENT },
    { type: "event", replyId: "r1", event: { type: "done" } },
  ],
  sent,
);

const cardOf = (state: ChatState, proposalId = "p1") => {
  const card = findLeadCard(state, proposalId);
  if (!card) throw new Error(`no card ${proposalId}`);
  return card;
};

describe("chatReducer: lead card", () => {
  it("adds the card to the reply after its text, idle and without a request id yet", () => {
    expect(reply(withCard, "r1").parts).toEqual([
      { kind: "text", text: "Ось заявка:" },
      {
        kind: "lead_card",
        proposalId: "p1",
        prefill: { name: "Олена", phone: "+380671234567" },
        summary: "2-кімнатна на Оболоні до 80 000 $",
        clientRequestId: null,
        submit: { status: "idle" },
      },
    ]);
    expect(reply(withCard, "r1").state).toEqual({ status: "done" });
  });

  it("counts a reply with only a card as content, not as a failed turn", () => {
    const state = run(
      [
        { type: "event", replyId: "r1", event: LEAD_EVENT },
        { type: "event", replyId: "r1", event: { type: "done" } },
      ],
      sent,
    );
    expect(reply(state, "r1").state).toEqual({ status: "done" });
  });

  it("ignores a repeated card event for the same proposal", () => {
    const once = chatReducer(sent, { type: "event", replyId: "r1", event: LEAD_EVENT });
    expect(chatReducer(once, { type: "event", replyId: "r1", event: LEAD_EVENT })).toBe(once);
  });

  it("goes pending on submit and keeps the first request id across retries", () => {
    const pending = chatReducer(withCard, { type: "lead_submit", proposalId: "p1", clientRequestId: "req-1" });
    expect(cardOf(pending)).toMatchObject({ clientRequestId: "req-1", submit: { status: "pending" } });
    // A double tap while pending changes nothing.
    expect(chatReducer(pending, { type: "lead_submit", proposalId: "p1", clientRequestId: "req-2" })).toBe(pending);

    const failed = chatReducer(pending, {
      type: "lead_result",
      proposalId: "p1",
      result: { status: "error", message: "Не вдалося" },
    });
    expect(cardOf(failed).submit).toEqual({ status: "error", message: "Не вдалося" });

    const retried = chatReducer(failed, { type: "lead_submit", proposalId: "p1", clientRequestId: "req-3" });
    expect(cardOf(retried)).toMatchObject({ clientRequestId: "req-1", submit: { status: "pending" } });
  });

  it("maps invalid and ok results", () => {
    const pending = chatReducer(withCard, { type: "lead_submit", proposalId: "p1", clientRequestId: "req-1" });
    const invalid = chatReducer(pending, {
      type: "lead_result",
      proposalId: "p1",
      result: { status: "invalid", fieldErrors: { phone: "Перевірте номер", consent: "Потрібна згода" } },
    });
    expect(cardOf(invalid).submit).toEqual({
      status: "invalid",
      fieldErrors: { phone: "Перевірте номер", consent: "Потрібна згода" },
    });

    const sentOk = run(
      [
        { type: "lead_submit", proposalId: "p1", clientRequestId: "req-1" },
        { type: "lead_result", proposalId: "p1", result: { status: "ok" } },
      ],
      invalid,
    );
    expect(cardOf(sentOk).submit).toEqual({ status: "ok" });
    // A sent card can't be sent again.
    expect(chatReducer(sentOk, { type: "lead_submit", proposalId: "p1", clientRequestId: "x" })).toBe(sentOk);
  });

  it("drops a result for a card that isn't pending or no longer exists", () => {
    const result = { type: "lead_result", proposalId: "p1", result: { status: "ok" } } as const;
    expect(chatReducer(withCard, result)).toBe(withCard);
    expect(chatReducer(INITIAL_CHAT_STATE, result)).toBe(INITIAL_CHAT_STATE);
  });

  it("knows the newest card in the chat", () => {
    expect(latestLeadCardId(sent.messages)).toBeNull();
    const second = run(
      [
        { type: "send", userId: "u2", replyId: "r2", text: "Ще варіант" },
        { type: "event", replyId: "r2", event: { ...LEAD_EVENT, proposal_id: "p2" } },
        { type: "event", replyId: "r2", event: { type: "done" } },
      ],
      withCard,
    );
    expect(latestLeadCardId(withCard.messages)).toBe("p1");
    expect(latestLeadCardId(second.messages)).toBe("p2");
  });
});
