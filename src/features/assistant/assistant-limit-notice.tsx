import { Info, Phone, RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";

import { MessengerLinks } from "@/components/layout/messenger-links";
import { Button } from "@/components/ui/button";
import { CONTACTS } from "@/constants/contacts";
import { GeneralRequestForm } from "@/features/leads/general-request-form";
import { ASSISTANT_MESSAGE_MAX_LENGTH } from "./assistant-events";
import type { AssistantLimitReason } from "./assistant-events";

type AssistantLimitNoticeProps = {
  reason: AssistantLimitReason;
  /** Only the newest reply shows the form, contacts and actions; an older limit keeps just its message. */
  latest: boolean;
  /** Sends the same message again (failed Turnstile check). */
  onRetry: () => void;
};

const formatCount = new Intl.NumberFormat("uk-UA").format;

export const LIMIT_MESSAGES: Record<AssistantLimitReason, string> = {
  rate_limit: "Забагато повідомлень за короткий час. Спробуйте за кілька хвилин.",
  conversation_limit: "Ця розмова вже довга. Залиште заявку — менеджер допоможе особисто.",
  budget: "Асистент зараз недоступний.",
  message_too_long: `Повідомлення задовге — до ${formatCount(ASSISTANT_MESSAGE_MAX_LENGTH)} символів.`,
  turnstile: "Не вдалося пройти перевірку. Спробуйте ще раз.",
};

/** Limits after which the visitor gets the request form and the agency's contacts instead of the assistant. */
const WITH_FALLBACK: readonly AssistantLimitReason[] = ["rate_limit", "conversation_limit", "budget"];

const FALLBACK_HINT = "Залиште заявку або зв'яжіться з нами — менеджер підбере варіанти й відповість на питання.";

/**
 * The request form (006) and the agency's phone and messengers, right in the chat. Budget and the
 * conversation cap also close the composer; its place offers «Нова розмова» (see the panel).
 */
const LimitFallback = ({ reason }: Pick<AssistantLimitNoticeProps, "reason">) => {
  const ref = useRef<HTMLDivElement>(null);

  // The block is taller than the chat on a phone: show its start (why, and the contacts), not the form's end.
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "start" });
  }, []);

  return (
    <div
      ref={ref}
      className="flex w-full min-w-0 scroll-mt-2 flex-col gap-4 rounded-2xl border bg-card p-4 text-card-foreground"
    >
      <div className="flex flex-col gap-1">
        <p role="status" className="text-base/relaxed font-medium">
          {LIMIT_MESSAGES[reason]}
        </p>
        <p className="text-sm text-muted-foreground">{FALLBACK_HINT}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <a href={CONTACTS.phone.href}>
            <Phone aria-hidden="true" />
            <span className="tabular-nums">{CONTACTS.phone.display}</span>
          </a>
        </Button>
        <MessengerLinks />
      </div>
      <GeneralRequestForm title="Залишити заявку" className="border-t pt-4" />
    </div>
  );
};

/** A calm note for a refused message: what happened and what the visitor can do now. */
export const AssistantLimitNotice = ({ reason, latest, onRetry }: AssistantLimitNoticeProps) => {
  if (latest && WITH_FALLBACK.includes(reason)) return <LimitFallback reason={reason} />;

  return (
    <div className="flex max-w-[85%] flex-col items-start gap-2 self-start">
      <p
        role="status"
        className="flex items-start gap-2 rounded-2xl bg-secondary px-4 py-3 text-sm/relaxed text-secondary-foreground"
      >
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {LIMIT_MESSAGES[reason]}
      </p>
      {latest && reason === "turnstile" && (
        <Button variant="outline" onClick={onRetry}>
          <RotateCcw aria-hidden="true" />
          Спробувати ще раз
        </Button>
      )}
    </div>
  );
};
