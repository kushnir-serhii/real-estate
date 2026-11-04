import { RotateCcw, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ASSISTANT_PERSONA } from "@/constants/assistant";
import { AssistantBubble } from "./assistant-bubble";
import { AssistantLeadCard } from "./assistant-lead-card";
import { AssistantLimitNotice } from "./assistant-limit-notice";
import { AssistantPropertyResults } from "./assistant-property-results";
import { AssistantTypingIndicator } from "./assistant-typing-indicator";
import type { AssistantReply, ChatMessage, ReplyPart } from "./chat-reducer";

type AssistantMessageProps = {
  message: ChatMessage;
  onRetry: (replyId: string) => void;
  /** The visitor follows a property link from the chat. */
  onNavigate?: () => void;
  /** The newest lead card in the chat; older unsent ones are stale. */
  latestCardId?: string | null;
  /** The last message in the chat: only its limit notice offers the form, contacts and retry. */
  latest?: boolean;
};

const VerifyingBubble = () => (
  <AssistantBubble from="assistant" className="flex items-center gap-2 text-muted-foreground">
    <ShieldCheck className="size-4 shrink-0 motion-safe:animate-pulse" aria-hidden="true" />
    Перевіряємо, що ви не робот…
  </AssistantBubble>
);

const TypingBubble = () => (
  <AssistantBubble from="assistant">
    <AssistantTypingIndicator />
  </AssistantBubble>
);

const renderPart = (part: ReplyPart, index: number, latestCardId: string | null, onNavigate?: () => void) => {
  switch (part.kind) {
    case "text":
      return (
        part.text !== "" && (
          <AssistantBubble key={index} from="assistant">
            <span className="sr-only">{ASSISTANT_PERSONA.name}: </span>
            {part.text}
          </AssistantBubble>
        )
      );
    case "properties":
      return <AssistantPropertyResults key={index} part={part} onNavigate={onNavigate} />;
    case "lead_card":
      return (
        <AssistantLeadCard key={part.proposalId} card={part} superseded={part.proposalId !== latestCardId} />
      );
    default: {
      const unreachable: never = part;
      return unreachable;
    }
  }
};

type ReplyBodyProps = {
  reply: AssistantReply;
  onRetry: (replyId: string) => void;
  onNavigate?: () => void;
  latestCardId: string | null;
  latest: boolean;
};

/** The reply's parts in arrival order (results, then the text about them), then its state. */
const ReplyBody = ({ reply, onRetry, onNavigate, latestCardId, latest }: ReplyBodyProps) => {
  const parts = reply.parts.map((part, index) => renderPart(part, index, latestCardId, onNavigate));

  switch (reply.state.status) {
    case "verifying":
      return <VerifyingBubble />;
    case "waiting":
      return <TypingBubble />;
    case "streaming":
      return (
        <>
          {parts}
          {/* Results are in, the words about them are not yet. */}
          {reply.parts.at(-1)?.kind !== "text" && <TypingBubble />}
        </>
      );
    case "done":
      return parts;
    case "error":
      return (
        <>
          {parts}
          <div className="flex max-w-[85%] flex-col items-start gap-2 self-start">
            <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium break-words text-destructive">
              {reply.state.message}
            </p>
            <Button variant="outline" onClick={() => onRetry(reply.id)}>
              <RotateCcw aria-hidden="true" />
              Спробувати ще раз
            </Button>
          </div>
        </>
      );
    case "limit":
      return (
        <>
          {parts}
          <AssistantLimitNotice reason={reply.state.reason} latest={latest} onRetry={() => onRetry(reply.id)} />
        </>
      );
    default: {
      const unreachable: never = reply.state;
      return unreachable;
    }
  }
};

export const AssistantMessage = ({
  message,
  onRetry,
  onNavigate,
  latestCardId = null,
  latest = false,
}: AssistantMessageProps) => (
  <li className="flex flex-col gap-2">
    {message.role === "user" ? (
      <AssistantBubble from="user">
        <span className="sr-only">Ви: </span>
        {message.text}
      </AssistantBubble>
    ) : (
      <ReplyBody
        reply={message}
        onRetry={onRetry}
        onNavigate={onNavigate}
        latestCardId={latestCardId}
        latest={latest}
      />
    )}
  </li>
);
