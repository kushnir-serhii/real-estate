import { useSyncExternalStore } from "react";

import { ASSISTANT_MESSAGE_MAX_LENGTH } from "./assistant-events";
import type { AssistantRequestInput } from "./assistant-events";
import { activeReply, chatReducer, INITIAL_CHAT_STATE } from "./chat-reducer";
import type { ChatAction, ChatState } from "./chat-reducer";
import { readStoredChat, writeStoredChat } from "./chat-storage";
import { propertySlugFromPath } from "./property-path";
import { readEventStream } from "./read-event-stream";

/**
 * The chat lives in this module, not in the panel component: closing the panel (which unmounts it)
 * keeps the conversation and lets a reply finish streaming. Loaded with the panel, on first open.
 */

const PAGE_URL_MAX_LENGTH = 2048;

export const buildAssistantRequest = (
  state: ChatState,
  message: string,
  pageUrl: string,
  pathname: string,
): AssistantRequestInput => ({
  conversation_id: state.conversationId ?? undefined,
  message: message.slice(0, ASSISTANT_MESSAGE_MAX_LENGTH),
  page_url: pageUrl.slice(0, PAGE_URL_MAX_LENGTH),
  property_slug: propertySlugFromPath(pathname),
});

let state: ChatState = INITIAL_CHAT_STATE;
let loaded = false;
let controller: AbortController | null = null;
let idCounter = 0;
const listeners = new Set<() => void>();

const newId = () => `${Date.now().toString(36)}-${(idCounter += 1)}`;

const ensureLoaded = () => {
  if (loaded) return;
  state = readStoredChat();
  loaded = true;
};

const dispatch = (action: ChatAction) => {
  ensureLoaded();
  const next = chatReducer(state, action);
  if (next === state) return;
  state = next;
  // Deltas aren't written one by one: the turn's end (done / error) writes the whole reply.
  if (!(action.type === "event" && action.event.type === "text")) writeStoredChat(state);
  listeners.forEach((listener) => listener());
};

const runTurn = async (replyId: string, message: string) => {
  controller?.abort();
  const own = new AbortController();
  controller = own;
  try {
    const response = await fetch("/api/assistant", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildAssistantRequest(state, message, window.location.href, window.location.pathname)),
      signal: own.signal,
    });
    if (!response.ok || !response.body) {
      dispatch({ type: "fail", replyId });
      return;
    }
    for await (const event of readEventStream(response.body)) {
      dispatch({ type: "event", replyId, event });
      if (event.type === "done") return;
    }
    // The stream closed without `done`: the reply is incomplete.
    dispatch({ type: "fail", replyId });
  } catch {
    // Aborted on purpose («Нова розмова»): the reply is already gone from the state.
    if (!own.signal.aborted) dispatch({ type: "fail", replyId });
  } finally {
    if (controller === own) controller = null;
  }
};

export const sendChatMessage = (text: string) => {
  ensureLoaded();
  const message = text.trim();
  if (message === "" || message.length > ASSISTANT_MESSAGE_MAX_LENGTH || activeReply(state)) return;
  const replyId = newId();
  dispatch({ type: "send", userId: newId(), replyId, text: message });
  void runTurn(replyId, message);
};

export const retryChatReply = (failedId: string) => {
  ensureLoaded();
  const failed = state.messages.find((item) => item.id === failedId);
  if (failed?.role !== "assistant" || failed.state.status !== "error" || activeReply(state)) return;
  const replyId = newId();
  dispatch({ type: "retry", failedId, replyId });
  void runTurn(replyId, failed.prompt);
};

/** «Нова розмова»: stops the reply in progress and forgets the conversation id and the messages. */
export const resetChat = () => {
  controller?.abort();
  controller = null;
  dispatch({ type: "reset" });
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = (): ChatState => {
  ensureLoaded();
  return state;
};

const getServerSnapshot = (): ChatState => INITIAL_CHAT_STATE;

export const useAssistantChat = (): ChatState => useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
