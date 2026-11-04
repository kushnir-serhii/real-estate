import { ASSISTANT_ERROR_MESSAGE } from "@/constants/assistant";
import type { AssistantEvent, AssistantLimitReason, AssistantPropertyCard } from "./assistant-events";
import type { AssistantLeadField, AssistantLeadState } from "./assistant-lead-state";

/** Display copy of the chat on the client. The server keeps the real history (spec 010). */

export type ReplyState =
  | { status: "waiting" }
  | { status: "streaming" }
  | { status: "done" }
  | { status: "error"; message: string }
  | { status: "limit"; reason: AssistantLimitReason };

export type ReplyStatus = ReplyState["status"];

export type UserMessage = { id: string; role: "user"; text: string };

/** One piece of a reply, in the order it arrived: property results come before the text about them. */
export type TextPart = { kind: "text"; text: string };
export type PropertiesPart = { kind: "properties"; items: AssistantPropertyCard[]; total: number; catalogUrl: string };

/** Where the visitor is with one lead card. `invalid` / `error` keep the card open for a fix or a retry. */
export type LeadCardSubmit =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "ok" }
  | { status: "invalid"; fieldErrors: Partial<Record<AssistantLeadField, string>> }
  | { status: "error"; message: string };

export type LeadCardPart = {
  kind: "lead_card";
  proposalId: string;
  prefill: { name?: string; phone?: string };
  summary: string;
  /** Made on the first submit and reused for every retry of this card: the server saves one lead. */
  clientRequestId: string | null;
  submit: LeadCardSubmit;
};

export type ReplyPart = TextPart | PropertiesPart | LeadCardPart;

export type AssistantReply = {
  id: string;
  role: "assistant";
  parts: ReplyPart[];
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
  | { type: "restore"; state: ChatState }
  /** The visitor sends a lead card (first try or a retry). Ignored while it is pending or already sent. */
  | { type: "lead_submit"; proposalId: string; clientRequestId: string }
  /** The server action's answer for that card. */
  | { type: "lead_result"; proposalId: string; result: AssistantLeadState };

export const INITIAL_CHAT_STATE: ChatState = { conversationId: null, messages: [] };

export const INTERRUPTED_MESSAGE = "Відповідь перервалася. Спробуйте ще раз.";

/** The reply's text parts joined (what the screen reader hears once the reply is complete). */
export const replyText = (reply: AssistantReply): string =>
  reply.parts
    .flatMap((part) => (part.kind === "text" ? [part.text] : []))
    .join("\n\n");

/** A delta extends the last text part, or starts a new one after property results. */
const appendText = (parts: ReplyPart[], delta: string): ReplyPart[] => {
  const last = parts.at(-1);
  return last?.kind === "text"
    ? [...parts.slice(0, -1), { kind: "text", text: last.text + delta }]
    : [...parts, { kind: "text", text: delta }];
};

const hasContent = (reply: AssistantReply): boolean =>
  reply.parts.some((part) => part.kind !== "text" || part.text.trim() !== "");

/** Every lead card in the chat, oldest first. */
const leadCards = (messages: readonly ChatMessage[]): LeadCardPart[] =>
  messages.flatMap((message) =>
    message.role === "assistant" ? message.parts.filter((part): part is LeadCardPart => part.kind === "lead_card") : [],
  );

export const findLeadCard = (state: ChatState, proposalId: string): LeadCardPart | null =>
  leadCards(state.messages).find((card) => card.proposalId === proposalId) ?? null;

/** The newest card: older cards that weren't sent are stale (the server keeps only the newest proposal). */
export const latestLeadCardId = (messages: readonly ChatMessage[]): string | null =>
  leadCards(messages).at(-1)?.proposalId ?? null;

/** Updates one card wherever it is; finished replies included (the card is filled in after the turn ends). */
const updateLeadCard = (
  state: ChatState,
  proposalId: string,
  update: (card: LeadCardPart) => LeadCardPart,
): ChatState => {
  let changed = false;
  const messages = state.messages.map((message) => {
    if (message.role !== "assistant") return message;
    const parts = message.parts.map((part) => {
      if (part.kind !== "lead_card" || part.proposalId !== proposalId) return part;
      const next = update(part);
      if (next !== part) changed = true;
      return next;
    });
    return parts.some((part, index) => part !== message.parts[index]) ? { ...message, parts } : message;
  });
  return changed ? { ...state, messages } : state;
};

const toSubmit = (result: AssistantLeadState): LeadCardSubmit => {
  switch (result.status) {
    case "ok":
      return { status: "ok" };
    case "invalid":
      return { status: "invalid", fieldErrors: result.fieldErrors };
    case "error":
      return { status: "error", message: result.message };
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
};

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
        parts: appendText(reply.parts, event.delta),
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
        // Nothing said or shown at all is a failed turn, not an empty bubble.
        state: hasContent(reply) ? { status: "done" } : { status: "error", message: ASSISTANT_ERROR_MESSAGE },
      }));
    case "properties":
      return updateOpenReply(state, replyId, (reply) => ({
        ...reply,
        parts: [
          ...reply.parts,
          { kind: "properties", items: event.items, total: event.total, catalogUrl: event.catalog_url },
        ],
        state: { status: "streaming" },
      }));
    case "lead_card":
      // A repeated event for the same proposal doesn't add a second card.
      if (findLeadCard(state, event.proposal_id)) return state;
      return updateOpenReply(state, replyId, (reply) => ({
        ...reply,
        parts: [
          ...reply.parts,
          {
            kind: "lead_card",
            proposalId: event.proposal_id,
            prefill: event.prefill,
            summary: event.summary,
            clientRequestId: null,
            submit: { status: "idle" },
          },
        ],
        state: { status: "streaming" },
      }));
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
          { id: action.replyId, role: "assistant", parts: [], prompt: action.text, state: { status: "waiting" } },
        ],
      };
    }
    case "retry": {
      if (activeReply(state)) return state;
      return updateReply(state, action.failedId, (reply) =>
        reply.state.status === "error"
          ? { ...reply, id: action.replyId, parts: [], state: { status: "waiting" } }
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
    case "lead_submit":
      return updateLeadCard(state, action.proposalId, (card) =>
        card.submit.status === "pending" || card.submit.status === "ok"
          ? card
          : { ...card, clientRequestId: card.clientRequestId ?? action.clientRequestId, submit: { status: "pending" } },
      );
    case "lead_result":
      return updateLeadCard(state, action.proposalId, (card) =>
        card.submit.status === "pending" ? { ...card, submit: toSubmit(action.result) } : card,
      );
    default: {
      const unreachable: never = action;
      return unreachable;
    }
  }
};
