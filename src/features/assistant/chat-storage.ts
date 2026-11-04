import { z } from "zod";

import { ASSISTANT_LIMIT_REASONS, assistantPropertyCardSchema } from "./assistant-events";
import { ASSISTANT_LEAD_FIELDS } from "./assistant-lead-state";
import { INITIAL_CHAT_STATE, INTERRUPTED_MESSAGE } from "./chat-reducer";
import type { AssistantReply, ChatMessage, ChatState, ReplyPart } from "./chat-reducer";

/** sessionStorage key: the display copy of the chat, so a reload keeps it. Closing the tab forgets it. */
export const CHAT_STORAGE_KEY = "sofiacity:assistant-chat";

/** Older messages are dropped from the copy; the server keeps the full history anyway. */
export const MAX_STORED_MESSAGES = 100;

const replyStateSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("verifying") }),
  z.object({ status: z.literal("waiting") }),
  z.object({ status: z.literal("streaming") }),
  z.object({ status: z.literal("done") }),
  z.object({ status: z.literal("error"), message: z.string() }),
  z.object({ status: z.literal("limit"), reason: z.enum(ASSISTANT_LIMIT_REASONS) }),
]);

const replyPartSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), text: z.string() }),
  z.object({
    kind: z.literal("properties"),
    items: z.array(assistantPropertyCardSchema),
    total: z.number().int().nonnegative(),
    catalogUrl: z.string(),
  }),
  z.object({
    kind: z.literal("lead_card"),
    proposalId: z.string().min(1),
    prefill: z.object({ name: z.string().optional(), phone: z.string().optional() }),
    summary: z.string(),
    clientRequestId: z.string().min(1).nullable(),
    submit: z
      .discriminatedUnion("status", [
        z.object({ status: z.literal("idle") }),
        z.object({ status: z.literal("pending") }),
        z.object({ status: z.literal("ok") }),
        z.object({
          status: z.literal("invalid"),
          fieldErrors: z.partialRecord(z.enum(ASSISTANT_LEAD_FIELDS), z.string()),
        }),
        z.object({ status: z.literal("error"), message: z.string() }),
      ])
      // An unreadable state only loses the card's last result, not the chat.
      .catch({ status: "idle" }),
  }),
]);

const replyBase = {
  id: z.string().min(1),
  role: z.literal("assistant"),
  prompt: z.string(),
  // Missing (stored before slice 4) or unreadable: the next retry makes a new one.
  clientMessageId: z.uuid().optional().catch(undefined),
  state: replyStateSchema,
};

/** A reply stored before replies had parts (one plain `text`): kept as a single text part. */
const legacyReplySchema = z
  .object({ ...replyBase, text: z.string() })
  .transform(
    ({ text, ...reply }): AssistantReply => ({ ...reply, parts: text === "" ? [] : [{ kind: "text", text }] }),
  );

const messageSchema = z.union([
  z.object({ id: z.string().min(1), role: z.literal("user"), text: z.string() }),
  z.object({ ...replyBase, parts: z.array(replyPartSchema) }),
  legacyReplySchema,
]);

const storedChatSchema = z.object({
  conversationId: z.uuid().nullable(),
  messages: z.array(messageSchema),
});

/**
 * A card that was sending when the page reloaded gets its button back. Sending again is safe: the
 * same `clientRequestId` goes with it, so the server never saves a second lead.
 */
const settlePart = (part: ReplyPart): ReplyPart =>
  part.kind === "lead_card" && part.submit.status === "pending" ? { ...part, submit: { status: "idle" } } : part;

/** A reply the page was receiving when it reloaded can't continue: it becomes a retryable error. */
const settle = (message: ChatMessage): ChatMessage => {
  if (message.role !== "assistant") return message;
  const settled = { ...message, parts: message.parts.map(settlePart) };
  return settled.state.status === "verifying" ||
    settled.state.status === "waiting" ||
    settled.state.status === "streaming"
    ? { ...settled, state: { status: "error", message: INTERRUPTED_MESSAGE } }
    : settled;
};

/** Stored JSON to chat state; anything malformed or foreign gives an empty chat. */
export const parseStoredChat = (raw: string | null): ChatState => {
  if (raw === null) return INITIAL_CHAT_STATE;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return INITIAL_CHAT_STATE;
  }
  const parsed = storedChatSchema.safeParse(json);
  if (!parsed.success) return INITIAL_CHAT_STATE;
  return {
    conversationId: parsed.data.conversationId,
    messages: parsed.data.messages.slice(-MAX_STORED_MESSAGES).map(settle),
  };
};

export const readStoredChat = (): ChatState => {
  try {
    return parseStoredChat(window.sessionStorage.getItem(CHAT_STORAGE_KEY));
  } catch {
    return INITIAL_CHAT_STATE;
  }
};

export const writeStoredChat = (state: ChatState) => {
  try {
    if (state.messages.length === 0 && state.conversationId === null) {
      window.sessionStorage.removeItem(CHAT_STORAGE_KEY);
      return;
    }
    const stored: ChatState = { ...state, messages: state.messages.slice(-MAX_STORED_MESSAGES) };
    window.sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Blocked or full: the chat still works for this page view.
  }
};
