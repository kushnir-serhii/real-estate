import { Phone, RotateCcw } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SheetClose } from "@/components/ui/sheet";
import { ASSISTANT_PERSONA } from "@/constants/assistant";
import { CONTACTS } from "@/constants/contacts";
import { AssistantBubble } from "./assistant-bubble";
import { AssistantPropertyResults } from "./assistant-property-results";
import { AssistantTypingIndicator } from "./assistant-typing-indicator";
import type { AssistantReply, ChatMessage, ReplyPart } from "./chat-reducer";

type AssistantMessageProps = {
  message: ChatMessage;
  onRetry: (replyId: string) => void;
  /** The visitor follows a property link from the chat. */
  onNavigate?: () => void;
};

const LimitNotice = () => (
  <div role="status" className="flex max-w-[85%] flex-col gap-3 self-start rounded-2xl bg-secondary p-4 text-secondary-foreground">
    <p className="text-base/relaxed">Зараз асистент недоступний. Залиште заявку або зателефонуйте нам.</p>
    <div className="flex flex-wrap gap-2">
      <SheetClose asChild>
        <Button asChild>
          <Link href="/contacts">Залишити заявку</Link>
        </Button>
      </SheetClose>
      <Button asChild variant="outline">
        <a href={CONTACTS.phone.href}>
          <Phone aria-hidden="true" />
          <span className="tabular-nums">{CONTACTS.phone.display}</span>
        </a>
      </Button>
    </div>
  </div>
);

const TypingBubble = () => (
  <AssistantBubble from="assistant">
    <AssistantTypingIndicator />
  </AssistantBubble>
);

const renderPart = (part: ReplyPart, index: number, onNavigate?: () => void) => {
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
};

/** The reply's parts in arrival order (results, then the text about them), then its state. */
const ReplyBody = ({ reply, onRetry, onNavigate }: ReplyBodyProps) => {
  const parts = reply.parts.map((part, index) => renderPart(part, index, onNavigate));

  switch (reply.state.status) {
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
          <LimitNotice />
        </>
      );
    default: {
      const unreachable: never = reply.state;
      return unreachable;
    }
  }
};

export const AssistantMessage = ({ message, onRetry, onNavigate }: AssistantMessageProps) => (
  <li className="flex flex-col gap-2">
    {message.role === "user" ? (
      <AssistantBubble from="user">
        <span className="sr-only">Ви: </span>
        {message.text}
      </AssistantBubble>
    ) : (
      <ReplyBody reply={message} onRetry={onRetry} onNavigate={onNavigate} />
    )}
  </li>
);
