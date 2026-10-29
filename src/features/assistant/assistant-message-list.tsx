"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { ASSISTANT_GREETING, ASSISTANT_PERSONA } from "@/constants/assistant";
import { AssistantBubble } from "./assistant-bubble";
import { AssistantEmptyState } from "./assistant-empty-state";
import { AssistantMessage } from "./assistant-message";
import type { ChatMessage } from "./chat-reducer";

type AssistantMessageListProps = {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onRetry: (replyId: string) => void;
};

/** Within this distance from the bottom the list keeps following new text. */
const STICK_THRESHOLD = 64;

const lastAssistantDoneId = (messages: ChatMessage[]): string | null => {
  const last = messages.at(-1);
  return last?.role === "assistant" && last.state.status === "done" ? last.id : null;
};

const lastUserId = (messages: ChatMessage[]): string | null =>
  messages.findLast((message) => message.role === "user")?.id ?? null;

/**
 * What the polite live region says: «typing» while waiting, then the whole reply once it is complete
 * (not every delta). Errors and limits announce themselves (`role="alert"` / `role="status"`).
 */
const announcement = (messages: ChatMessage[], skipId: string | null): string => {
  const last = messages.at(-1);
  if (last?.role !== "assistant") return "";
  if (last.state.status === "waiting") return `${ASSISTANT_PERSONA.name} пише відповідь…`;
  if (last.state.status === "done" && last.id !== skipId) return `${ASSISTANT_PERSONA.name}: ${last.text}`;
  return "";
};

export const AssistantMessageList = ({ messages, onSend, onRetry }: AssistantMessageListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const seenUserIdRef = useRef<string | null>(null);
  // A reply that was already complete when the panel opened isn't read out again.
  const [restoredId] = useState(() => lastAssistantDoneId(messages));

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element) return;
    stickRef.current = element.scrollHeight - element.scrollTop - element.clientHeight <= STICK_THRESHOLD;
  };

  // Follow new content unless the visitor scrolled up to read; their own new message always brings them down.
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const userId = lastUserId(messages);
    if (userId !== seenUserIdRef.current) {
      seenUserIdRef.current = userId;
      stickRef.current = true;
    }
    if (stickRef.current) element.scrollTop = element.scrollHeight;
  }, [messages]);

  return (
    <div ref={scrollRef} onScroll={handleScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="flex min-h-full flex-col justify-end gap-3 p-4">
        <AssistantBubble from="assistant">{ASSISTANT_GREETING}</AssistantBubble>
        {messages.length === 0 ? (
          <AssistantEmptyState onPick={onSend} />
        ) : (
          <ol aria-label="Розмова" className="flex flex-col gap-3">
            {messages.map((message) => (
              <AssistantMessage key={message.id} message={message} onRetry={onRetry} />
            ))}
          </ol>
        )}
      </div>
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement(messages, restoredId)}
      </p>
    </div>
  );
};
