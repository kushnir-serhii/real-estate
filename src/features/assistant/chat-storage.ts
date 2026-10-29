import { z } from "zod";

import { ASSISTANT_LIMIT_REASONS, assistantPropertyCardSchema } from "./assistant-events";
import { INITIAL_CHAT_STATE, INTERRUPTED_MESSAGE } from "./chat-reducer";
import type { AssistantReply, ChatMessage, ChatState } from "./chat-reducer";

/** sessionStorage key: the display copy of the chat, so a reload keeps it. Closing the tab forgets it. */
export const CHAT_STORAGE_KEY = "sofiacity:assistant-chat";

/** Older messages are dropped from the copy; the server keeps the full history anyway. */
export const MAX_STORED_MESSAGES = 100;

const replyStateSchema = z.discriminatedUnion("status", [
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
]);

const replyBase = {
  id: z.string().min(1),
  role: z.literal("assistant"),
  prompt: z.string(),
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

/** A reply the page was receiving when it reloaded can't continue: it becomes a retryable error. */
const settle = (message: ChatMessage): ChatMessage =>
  message.role === "assistant" && (message.state.status === "waiting" || message.state.status === "streaming")
    ? { ...message, state: { status: "error", message: INTERRUPTED_MESSAGE } }
    : message;

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
