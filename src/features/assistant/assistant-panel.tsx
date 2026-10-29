"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { resetChat, retryChatReply, sendChatMessage, useAssistantChat } from "./assistant-chat-store";
import { AssistantComposer } from "./assistant-composer";
import { AssistantMessageList } from "./assistant-message-list";
import { AssistantPanelHeader } from "./assistant-panel-header";
import { activeReply } from "./chat-reducer";

type AssistantPanelProps = {
  /** The visitor follows a property link from the chat (the launcher closes the full-screen panel on phones). */
  onNavigate?: () => void;
};

/** Chat body inside the launcher's sheet. Loaded on first open (`next/dynamic`), so pages don't ship it. */
export const AssistantPanel = ({ onNavigate }: AssistantPanelProps) => {
  const chat = useAssistantChat();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const busy = activeReply(chat) !== null;
  const hasMessages = chat.messages.length > 0;

  // With a mouse and keyboard, start typing right away; on phones don't pop the keyboard over the greeting.
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) textareaRef.current?.focus();
  }, []);

  const handleReset = () => {
    resetChat();
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
      <AssistantComposer busy={busy} onSend={sendChatMessage} textareaRef={textareaRef} />
    </>
  );
};
