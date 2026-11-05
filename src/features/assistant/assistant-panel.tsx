"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";

import { Button } from "@/components/ui/button";
import { TURNSTILE_SITE_KEY } from "@/features/leads/turnstile-site-key";
import { resetChat, retryChatReply, sendChatMessage, useAssistantChat } from "./assistant-chat-store";
import { AssistantComposer } from "./assistant-composer";
import { AssistantMessageList } from "./assistant-message-list";
import { AssistantPanelHeader } from "./assistant-panel-header";
import { AssistantTurnstile } from "./assistant-turnstile";
import { activeReply, composerLock, lastLimit, needsTurnstile } from "./chat-reducer";
import type { ChatState, ComposerLock } from "./chat-reducer";

type AssistantPanelProps = {
  /** The visitor follows a property link from the chat (the launcher closes the full-screen panel on phones). */
  onNavigate?: () => void;
};

const LOCK_NOTES: Record<ComposerLock, string> = {
  budget: "Віртуальний консультант зараз не може відповідати. Скористайтеся заявкою або контактами вище.",
  conversation_limit: "Щоб продовжити з консультантом, почніть нову розмову.",
};

type LockedComposerProps = { lock: ComposerLock; onReset: () => void };

/** Instead of the input while every next message would be refused: why, and «Нова розмова». */
const LockedComposer = ({ lock, onReset }: LockedComposerProps) => {
  const ref = useRef<HTMLDivElement>(null);

  // The input the visitor was in is gone: keep focus inside the panel instead of losing it.
  useEffect(() => {
    if (document.activeElement === document.body) ref.current?.focus();
  }, []);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="flex shrink-0 flex-col items-center gap-2 border-t bg-popover px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center outline-none"
    >
      <p className="text-sm text-muted-foreground">{LOCK_NOTES[lock]}</p>
      <Button variant="outline" onClick={onReset} className="w-full">
        <RotateCcw aria-hidden="true" />
        Нова розмова
      </Button>
    </div>
  );
};

/** The refused too-long message goes back into the input. */
const restoreOf = (chat: ChatState): { key: string; text: string } | null => {
  const limit = lastLimit(chat);
  if (limit?.reason !== "message_too_long") return null;
  const reply = chat.messages.at(-1);
  return reply?.role === "assistant" ? { key: limit.replyId, text: reply.prompt } : null;
};

/** Chat body inside the launcher's sheet. Loaded on first open (`next/dynamic`), so pages don't ship it. */
export const AssistantPanel = ({ onNavigate }: AssistantPanelProps) => {
  const chat = useAssistantChat();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const busy = activeReply(chat) !== null;
  const hasMessages = chat.messages.length > 0;
  const lock = composerLock(chat);

  // With a mouse and keyboard, start typing right away; on phones don't pop the keyboard over the greeting.
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) textareaRef.current?.focus();
  }, []);

  const handleReset = () => {
    // Rendered right away, so the input is back (also after a locked chat) before it gets focus.
    flushSync(resetChat);
    textareaRef.current?.focus();
  };

  return (
    <>
      <AssistantPanelHeader
        actions={
          hasMessages && (
            <Button variant="ghost" onClick={handleReset} className="px-3">
              <RotateCcw aria-hidden="true" />
              Нова розмова
            </Button>
          )
        }
      />
      <AssistantMessageList
        messages={chat.messages}
        onSend={sendChatMessage}
        onRetry={retryChatReply}
        onNavigate={onNavigate}
      />
      {TURNSTILE_SITE_KEY && needsTurnstile(chat) && <AssistantTurnstile />}
      {lock ? (
        <LockedComposer lock={lock} onReset={handleReset} />
      ) : (
        <AssistantComposer busy={busy} onSend={sendChatMessage} textareaRef={textareaRef} restore={restoreOf(chat)} />
      )}
    </>
  );
};
