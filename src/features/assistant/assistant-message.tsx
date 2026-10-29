import { Phone, RotateCcw } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SheetClose } from "@/components/ui/sheet";
import { ASSISTANT_PERSONA } from "@/constants/assistant";
import { CONTACTS } from "@/constants/contacts";
import { AssistantBubble } from "./assistant-bubble";
import { AssistantTypingIndicator } from "./assistant-typing-indicator";
import type { AssistantReply, ChatMessage } from "./chat-reducer";

type AssistantMessageProps = {
  message: ChatMessage;
  onRetry: (replyId: string) => void;
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

const ReplyBody = ({ reply, onRetry }: { reply: AssistantReply; onRetry: (replyId: string) => void }) => {
  const text = reply.text !== "" && (
    <AssistantBubble from="assistant">
      <span className="sr-only">{ASSISTANT_PERSONA.name}: </span>
      {reply.text}
    </AssistantBubble>
  );

  switch (reply.state.status) {
    case "waiting":
      return (
        <AssistantBubble from="assistant">
          <AssistantTypingIndicator />
        </AssistantBubble>
      );
    case "streaming":
    case "done":
      return text;
    case "error":
      return (
        <>
          {text}
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
          {text}
          <LimitNotice />
        </>
      );
    default: {
      const unreachable: never = reply.state;
      return unreachable;
    }
  }
};

export const AssistantMessage = ({ message, onRetry }: AssistantMessageProps) => (
  <li className="flex flex-col gap-2">
    {message.role === "user" ? (
      <AssistantBubble from="user">
        <span className="sr-only">Ви: </span>
        {message.text}
      </AssistantBubble>
    ) : (
      <ReplyBody reply={message} onRetry={onRetry} />
    )}
  </li>
);
