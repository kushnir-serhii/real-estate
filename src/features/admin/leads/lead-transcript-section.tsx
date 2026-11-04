import { MessageSquareOff } from "lucide-react";

import type { LeadTranscript, TranscriptMessage } from "@/lib/db/assistant";
import { cn } from "@/lib/utils";
import { ExternalLink } from "./external-link";
import { LeadDateTime } from "./lead-date-time";
import { LeadSection } from "./lead-section";
import { TranscriptRetry } from "./transcript-retry";

/** The transcript as the page loaded it; `error` keeps the rest of the lead on screen. */
export type LeadTranscriptLoad = LeadTranscript | { status: "error" };

type LeadTranscriptSectionProps = { transcript: LeadTranscriptLoad };

export const TRANSCRIPT_ROLE_LABELS = { user: "Відвідувач", assistant: "Асистент" } as const satisfies Record<
  TranscriptMessage["role"],
  string
>;

const TranscriptEntry = ({ message }: { message: TranscriptMessage }) => (
  <li
    className={cn(
      "flex min-w-0 flex-col gap-1.5 rounded-lg px-4 py-3",
      message.role === "assistant" ? "bg-muted/60" : "ring-1 ring-foreground/10",
    )}
  >
    <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
      <span className={cn("font-medium", message.role === "user" && "text-primary")}>
        {TRANSCRIPT_ROLE_LABELS[message.role]}
      </span>
      <LeadDateTime iso={message.created_at} layout="inline" className="text-muted-foreground" />
    </div>
    <p className="text-base break-words whitespace-pre-line">{message.content}</p>
    {message.properties && message.properties.length > 0 && (
      <div className="flex flex-col gap-0.5 text-sm">
        <span className="text-muted-foreground">Знайдені об&apos;єкти</span>
        <ul className="flex flex-col">
          {message.properties.map((property, index) => (
            <li key={`${property.url}-${index}`} className="min-w-0">
              <ExternalLink href={property.url}>{property.title}</ExternalLink>
            </li>
          ))}
        </ul>
      </div>
    )}
  </li>
);

const TranscriptBody = ({ transcript }: LeadTranscriptSectionProps) => {
  switch (transcript.status) {
    case "available":
      return transcript.messages.length > 0 ? (
        <ol aria-label="Повідомлення" className="flex flex-col gap-3">
          {transcript.messages.map((message, index) => (
            <TranscriptEntry key={`${message.created_at}-${index}`} message={message} />
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">У переписці немає повідомлень.</p>
      );
    case "deleted":
      return (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <MessageSquareOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Переписку видалено автоматично через 30 днів. Побажання клієнта збережено в заявці.
        </p>
      );
    case "error":
      return (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-sm font-medium text-destructive">
            Не вдалося завантажити переписку. Заявка на місці — спробуйте ще раз.
          </p>
          <TranscriptRetry />
        </div>
      );
    default: {
      const unreachable: never = transcript;
      return unreachable;
    }
  }
};

/** The chat that led to an AI lead, as a plain readable log (kept 30 days). */
export const LeadTranscriptSection = ({ transcript }: LeadTranscriptSectionProps) => (
  <LeadSection id="transcript" title="Переписка з асистентом">
    <TranscriptBody transcript={transcript} />
  </LeadSection>
);
