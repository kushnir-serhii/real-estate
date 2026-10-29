import { ASSISTANT_ERROR_MESSAGE } from "@/constants/assistant";
import type { AssistantEvent, AssistantLimitReason } from "./assistant-events";

/** Display copy of the chat on the client. The server keeps the real history (spec 010). */

export type ReplyState =
  | { status: "waiting" }
  | { status: "streaming" }
  | { status: "done" }
  | { status: "error"; message: string }
  | { status: "limit"; reason: AssistantLimitReason };

export type ReplyStatus = ReplyState["status"];

export type UserMessage = { id: string; role: "user"; text: string };

export type AssistantReply = {
  id: string;
  role: "assistant";
  text: string;
  /** The visitor's message this reply answers: «Спробувати ще раз» sends it again. */
  prompt: string;
  state: ReplyState;
};

export type ChatMessage = UserMessage | AssistantReply;

export type ChatState = {
  conversationId: string | null;
  messages: ChatMessage[];
};

export type ChatAction =
  | { type: "send"; userId: string; replyId: string; text: string }
  | { type: "retry"; failedId: string; replyId: string }
  | { type: "event"; replyId: string; event: AssistantEvent }
  /** Network failure, non-OK response, or the stream ended without `done`. */
  | { type: "fail"; replyId: string; message?: string }
  | { type: "reset" }
  | { type: "restore"; state: ChatState };

export const INITIAL_CHAT_STATE: ChatState = { conversationId: null, messages: [] };

export const INTERRUPTED_MESSAGE = "Відповідь перервалася. Спробуйте ще раз.";

const isOpen = (state: ReplyState) => state.status === "waiting" || state.status === "streaming";

/** The reply being received right now, if any. */
export const activeReply = (state: ChatState): AssistantReply | null => {
  const last = state.messages.at(-1);
  return last?.role === "assistant" && isOpen(last.state) ? last : null;
};

const updateReply = (
  state: ChatState,
  replyId: string,
  update: (reply: AssistantReply) => AssistantReply,
): ChatState => {
  let changed = false;
  const messages = state.messages.map((message) => {
    if (message.role !== "assistant" || message.id !== replyId) return message;
    const next = update(message);
    if (next !== message) changed = true;
    return next;
  });
  return changed ? { ...state, messages } : state;
};

/** Only a reply still receiving can change: late events of an aborted or finished turn are dropped. */
const updateOpenReply = (
  state: ChatState,
  replyId: string,
  update: (reply: AssistantReply) => AssistantReply,
): ChatState => updateReply(state, replyId, (reply) => (isOpen(reply.state) ? update(reply) : reply));

const applyEvent = (state: ChatState, replyId: string, event: AssistantEvent): ChatState => {
  switch (event.type) {
    case "conversation":
      return activeReply(state)?.id === replyId ? { ...state, conversationId: event.id } : state;
    case "text":
      if (event.delta === "") return state;
      return updateOpenReply(state, replyId, (reply) => ({
        ...reply,
        text: reply.text + event.delta,
        state: { status: "streaming" },
      }));
    case "error":
      return updateOpenReply(state, replyId, (reply) => ({
        ...reply,
        state: { status: "error", message: event.message || ASSISTANT_ERROR_MESSAGE },
      }));
    case "limit":
      return updateOpenReply(state, replyId, (reply) => ({
        ...reply,
        state: { status: "limit", reason: event.reason },
      }));
    case "done":
      return updateOpenReply(state, replyId, (reply) => ({
        ...reply,
        // Nothing said at all is a failed turn, not an empty bubble.
        state: reply.text.trim() === "" ? { status: "error", message: ASSISTANT_ERROR_MESSAGE } : { status: "done" },
      }));
    case "properties":
    case "lead_card":
      // Property cards (slice 2) and the lead card (slice 3) are added to the reply here.
      return state;
    default: {
      const unreachable: never = event;
      return unreachable;
    }
  }
};

export const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case "send": {
      if (activeReply(state)) return state;
      return {
        ...state,
        messages: [
          ...state.messages,
          { id: action.userId, role: "user", text: action.text },
          { id: action.replyId, role: "assistant", text: "", prompt: action.text, state: { status: "waiting" } },
        ],
      };
    }
    case "retry": {
      if (activeReply(state)) return state;
      return updateReply(state, action.failedId, (reply) =>
        reply.state.status === "error"
          ? { ...reply, id: action.replyId, text: "", state: { status: "waiting" } }
          : reply,
      );
    }
    case "event":
      return applyEvent(state, action.replyId, action.event);
    case "fail":
      return updateOpenReply(state, action.replyId, (reply) => ({
        ...reply,
        state: { status: "error", message: action.message ?? ASSISTANT_ERROR_MESSAGE },
      }));
    case "reset":
      return INITIAL_CHAT_STATE;
    case "restore":
      return action.state;
    default: {
      const unreachable: never = action;
      return unreachable;
    }
  }
};
