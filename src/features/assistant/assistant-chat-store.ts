import { useSyncExternalStore } from "react";

import { newRequestId } from "@/features/leads/new-request-id";
import { TURNSTILE_SITE_KEY } from "@/features/leads/turnstile-site-key";
import { submitAssistantLead } from "./actions";
import { ASSISTANT_MESSAGE_MAX_LENGTH } from "./assistant-events";
import type { AssistantRequestInput } from "./assistant-events";
import { ASSISTANT_LEAD_MESSAGES } from "./assistant-lead-state";
import type { AssistantLeadState } from "./assistant-lead-state";
import { takeTurnstileToken, waitForTurnstileToken } from "./assistant-turnstile-token";
import { activeReply, canRetry, chatReducer, composerLock, findLeadCard, INITIAL_CHAT_STATE, needsTurnstile } from "./chat-reducer";
import type { ChatAction, ChatState } from "./chat-reducer";
import { readStoredChat, writeStoredChat } from "./chat-storage";
import { propertySlugFromPath } from "./property-path";
import { readEventStream } from "./read-event-stream";

/**
 * The chat lives in this module, not in the panel component: closing the panel (which unmounts it)
 * keeps the conversation and lets a reply finish streaming. Loaded with the panel, on first open.
 */

const PAGE_URL_MAX_LENGTH = 2048;

/** One attempt at a visitor message: the same `clientMessageId` on every retry, a fresh token when needed. */
export type OutgoingMessage = { text: string; clientMessageId: string; turnstileToken?: string };

export const buildAssistantRequest = (
  state: ChatState,
  message: OutgoingMessage,
  pageUrl: string,
  pathname: string,
): AssistantRequestInput => ({
  conversation_id: state.conversationId ?? undefined,
  message: message.text.slice(0, ASSISTANT_MESSAGE_MAX_LENGTH),
  client_message_id: message.clientMessageId,
  turnstile_token: message.turnstileToken,
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

/**
 * Whether this attempt needs a Turnstile token, and the token if one is ready. With the site key empty
 * nothing is sent (the server's fixture passes an empty token).
 */
const prepareTurnstile = (): { verify: boolean; token?: string } => {
  if (!TURNSTILE_SITE_KEY || !needsTurnstile(state)) return { verify: false };
  const token = takeTurnstileToken();
  return token === null ? { verify: true } : { verify: false, token };
};

const runTurn = async (replyId: string, outgoing: Omit<OutgoingMessage, "turnstileToken">, prepared: { verify: boolean; token?: string }) => {
  controller?.abort();
  const own = new AbortController();
  controller = own;
  try {
    let turnstileToken = prepared.token;
    if (prepared.verify) {
      // «Перевіряємо, що ви не робот…» until the widget gives a token.
      const token = await waitForTurnstileToken(own.signal);
      if (own.signal.aborted) return;
      if (token === null) {
        dispatch({ type: "event", replyId, event: { type: "limit", reason: "turnstile" } });
        return;
      }
      turnstileToken = token;
      dispatch({ type: "verified", replyId });
    }
    const request = buildAssistantRequest(
      state,
      { ...outgoing, turnstileToken },
      window.location.href,
      window.location.pathname,
    );
    const response = await fetch("/api/assistant", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
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
  if (message === "" || message.length > ASSISTANT_MESSAGE_MAX_LENGTH || activeReply(state) || composerLock(state)) {
    return;
  }
  const replyId = newId();
  const clientMessageId = newRequestId();
  const prepared = prepareTurnstile();
  dispatch({ type: "send", userId: newId(), replyId, text: message, clientMessageId, verify: prepared.verify });
  void runTurn(replyId, { text: message, clientMessageId }, prepared);
};

export const retryChatReply = (failedId: string) => {
  ensureLoaded();
  const failed = state.messages.find((item) => item.id === failedId);
  if (failed?.role !== "assistant" || !canRetry(failed) || activeReply(state)) return;
  const replyId = newId();
  // Decided before the retry clears the failed state (a failed check needs a fresh token).
  const prepared = prepareTurnstile();
  dispatch({
    type: "retry",
    failedId,
    replyId,
    clientMessageId: failed.clientMessageId ?? newRequestId(),
    verify: prepared.verify,
  });
  const retried = state.messages.find((item) => item.id === replyId);
  const clientMessageId = retried?.role === "assistant" ? retried.clientMessageId : undefined;
  if (clientMessageId === undefined) return;
  void runTurn(replyId, { text: failed.prompt, clientMessageId }, prepared);
};

/** What the visitor typed into a lead card. The wishes are not sent: the server has its own copy. */
export type LeadCardFields = { name: string; phone: string; email: string; consent: boolean; honeypot: string };

const LEAD_NETWORK_ERROR = "Не вдалося надіслати заявку. Перевірте інтернет і спробуйте ще раз.";

/**
 * Sends one lead card through the server action. The card's request id is made once and reused on
 * every retry, so a double tap or a retry after a lost answer still gives one lead.
 */
export const submitLeadCard = async (proposalId: string, fields: LeadCardFields): Promise<void> => {
  ensureLoaded();
  const card = findLeadCard(state, proposalId);
  if (!card || card.submit.status === "pending" || card.submit.status === "ok") return;
  const clientRequestId = card.clientRequestId ?? newRequestId();
  const conversationId = state.conversationId;
  dispatch({ type: "lead_submit", proposalId, clientRequestId });

  let result: AssistantLeadState;
  if (conversationId === null) {
    result = { status: "error", message: ASSISTANT_LEAD_MESSAGES.stale };
  } else {
    try {
      result = await submitAssistantLead({
        conversation_id: conversationId,
        proposal_id: proposalId,
        client_request_id: clientRequestId,
        name: fields.name,
        phone: fields.phone,
        email: fields.email.trim() === "" ? undefined : fields.email,
        consent: fields.consent,
        honeypot: fields.honeypot,
      });
    } catch {
      // A dropped connection rejects the action: shown as a retryable error, the input stays.
      result = { status: "error", message: LEAD_NETWORK_ERROR };
    }
  }
  dispatch({ type: "lead_result", proposalId, result });
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
