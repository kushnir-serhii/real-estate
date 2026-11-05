"use client";

import { CircleCheck, ClipboardList, Loader2 } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { ConsentField } from "@/features/leads/consent-field";
import { HoneypotField } from "@/features/leads/honeypot-field";
import { LeadFormFields } from "@/features/leads/lead-form-fields";
import { HONEYPOT_FIELD } from "@/features/leads/lead-form-values";
import { submitLeadCard } from "./assistant-chat-store";
import type { LeadCardFields } from "./assistant-chat-store";
import type { LeadCardPart } from "./chat-reducer";

type AssistantLeadCardProps = {
  card: LeadCardPart;
  /** A newer card in the conversation replaced this one (the server keeps only the newest proposal). */
  superseded: boolean;
};

export const LEAD_CARD_ANNOUNCEMENT = "Перевірте дані заявки";

const entry = (data: FormData, name: string): string => {
  const value = data.get(name);
  return typeof value === "string" ? value : "";
};

const readFields = (form: HTMLFormElement): LeadCardFields => {
  const data = new FormData(form);
  return {
    name: entry(data, "name"),
    phone: entry(data, "phone"),
    email: entry(data, "email"),
    consent: data.get("consent") !== null,
    honeypot: entry(data, HONEYPOT_FIELD),
  };
};

type LeadCardSentProps = { takeFocus: boolean };

/** Replaces the form once the lead is saved. Takes focus only right after sending here (the button is gone). */
const LeadCardSent = ({ takeFocus }: LeadCardSentProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (takeFocus) ref.current?.focus();
  }, [takeFocus]);

  return (
    <div
      ref={ref}
      role="status"
      tabIndex={-1}
      className="flex w-full items-start gap-3 rounded-2xl bg-accent p-4 text-accent-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <CircleCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
      <p className="font-medium">Дякуємо! Менеджер зателефонує найближчим часом.</p>
    </div>
  );
};

const LeadCardStale = () => (
  <p className="self-start rounded-xl border border-dashed px-3 py-2 text-sm text-muted-foreground">
    Застаріла картка. Актуальна заявка — нижче.
  </p>
);

type LeadCardFormProps = { card: LeadCardPart; onSubmitted: () => void };

/**
 * Name and phone come prefilled from the chat; the visitor checks them, ticks the consent and sends.
 * Inputs are uncontrolled (except the phone mask) and survive invalid and failed submits.
 */
const LeadCardForm = ({ card, onSubmitted }: LeadCardFormProps) => {
  const id = useId();
  const titleId = `${id}-title`;
  const messageId = `${id}-message`;
  const formRef = useRef<HTMLFormElement>(null);
  const [attempts, setAttempts] = useState(0);
  const [, startTransition] = useTransition();
  const { submit } = card;
  const pending = submit.status === "pending";
  const errors = submit.status === "invalid" ? submit.fieldErrors : {};
  const message = submit.status === "error" ? submit.message : null;

  // Invalid after a submit here: take the visitor to the first field to fix (never on reopening the panel).
  useEffect(() => {
    if (attempts === 0 || submit.status !== "invalid") return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [attempts, submit]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const fields = readFields(event.currentTarget);
    setAttempts((value) => value + 1);
    onSubmitted();
    startTransition(() => submitLeadCard(card.proposalId, fields));
  };

  return (
    <section
      aria-labelledby={titleId}
      className="flex w-full min-w-0 flex-col gap-4 rounded-2xl border bg-card p-4 text-card-foreground"
    >
      <div className="flex flex-col gap-2">
        <h3 id={titleId} className="flex items-center gap-2 text-base font-bold">
          <ClipboardList className="size-5 shrink-0 text-primary" aria-hidden="true" />
          Заявка менеджеру
        </h3>
        {card.summary.trim() !== "" && (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm/relaxed break-words whitespace-pre-wrap">
            {card.summary}
          </p>
        )}
      </div>
      <form
        ref={formRef}
        noValidate
        onSubmit={handleSubmit}
        aria-labelledby={titleId}
        aria-busy={pending}
        className="@container flex flex-col gap-4"
      >
        <LeadFormFields errors={errors} defaultValues={card.prefill} />
        <ConsentField error={errors.consent} />
        <HoneypotField />

        {message && (
          <p
            id={messageId}
            role="alert"
            className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium break-words text-destructive"
          >
            {message}
          </p>
        )}

        <p role="status" className="sr-only">
          {pending ? "Надсилаємо заявку…" : ""}
        </p>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          aria-describedby={message ? messageId : undefined}
          className="w-full"
        >
          {pending ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Надсилаємо…
            </>
          ) : submit.status === "error" ? (
            "Спробувати ще раз"
          ) : (
            "Надіслати"
          )}
        </Button>
      </form>
    </section>
  );
};

/** The assistant's lead card in the chat: the form, then a short «thank you»; an older unsent card is marked stale. */
export const AssistantLeadCard = ({ card, superseded }: AssistantLeadCardProps) => {
  const [submittedHere, setSubmittedHere] = useState(false);

  if (card.submit.status === "ok") return <LeadCardSent takeFocus={submittedHere} />;
  if (superseded) return <LeadCardStale />;
  return <LeadCardForm card={card} onSubmitted={() => setSubmittedHere(true)} />;
};
