import { describe, expect, it } from "vitest";

import { ASSISTANT_ERROR_MESSAGE } from "@/constants/assistant";
import { activeReply, chatReducer, INITIAL_CHAT_STATE } from "./chat-reducer";
import type { AssistantReply, ChatAction, ChatState } from "./chat-reducer";

const CONVERSATION = "7d6a1f0e-3c1b-4a53-9d2f-0a1b2c3d4e5f";

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
      { id: "r1", role: "assistant", text: "", prompt: "Купити", state: { status: "waiting" } },
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
    expect(reply(state, "r1")).toMatchObject({ text: "Добре, який район?", state: { status: "done" } });
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
      text: "",
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

  it("leaves the state alone for property cards and the lead card (later slices)", () => {
    const state = chatReducer(sent, {
      type: "event",
      replyId: "r1",
      event: { type: "properties", items: [], total: 0, catalog_url: "/catalog" },
    });
    expect(state).toBe(sent);
  });
});
