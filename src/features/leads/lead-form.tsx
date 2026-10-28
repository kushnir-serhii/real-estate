"use client";

import { Loader2 } from "lucide-react";
import { startTransition, useActionState, useEffect, useId, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { submitLead } from "./actions";
import { ConsentField } from "./consent-field";
import { HoneypotField } from "./honeypot-field";
import { LeadFormFields } from "./lead-form-fields";
import { initialLeadFormState } from "./lead-state";
import type { LeadField, LeadFormState } from "./lead-state";
import { LeadSuccess } from "./lead-success";
import { TurnstileWidget } from "./turnstile-widget";

type LeadErrors = Partial<Record<LeadField, string>>;

type LeadFormProps = {
  kind: "property_request" | "general";
  /** Kind-specific values the visitor doesn't edit: `property_id`, `similar_to`. */
  hiddenFields?: Record<string, string | undefined>;
  title?: string;
  description?: string;
  messagePlaceholder: string;
  /** Kind-specific inputs shown above the common ones; they get the field errors of the last submit. */
  renderExtraFields?: (errors: LeadErrors) => ReactNode;
  className?: string;
};

/** Fields the visitor can't fix by hand: their errors go to the message above the button. */
const HIDDEN_FIELDS: readonly LeadField[] = ["kind", "client_request_id", "property_id", "similar_to"];

const UUID_TEMPLATE = "10000000-1000-4000-8000-100000000000";

/** `crypto.randomUUID` exists only in secure contexts (not on a phone opening the dev server over http). */
const newRequestId = (): string => {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return UUID_TEMPLATE.replace(/[018]/g, (c) =>
    (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16),
  );
};

const utmFromLocation = (): string => {
  const utm: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(window.location.search)) {
    if (key.startsWith("utm_") && value !== "") utm[key] = value;
  }
  return Object.keys(utm).length > 0 ? JSON.stringify(utm) : "";
};

const NETWORK_ERROR = "Не вдалося надіслати заявку. Перевірте інтернет і спробуйте ще раз.";

/** A dropped connection rejects the action: show it as the error state instead of the error page, keeping the input. */
const submitSafely = async (prev: LeadFormState, formData: FormData): Promise<LeadFormState> => {
  try {
    return await submitLead(prev, formData);
  } catch {
    return { status: "error", message: NETWORK_ERROR };
  }
};

const formMessage = (state: LeadFormState): string | null => {
  switch (state.status) {
    case "idle":
    case "ok":
      return null;
    case "error":
      return state.message;
    case "invalid": {
      const messages = HIDDEN_FIELDS.flatMap((field) => state.fieldErrors[field] ?? []);
      return messages.length > 0 ? [...new Set(messages)].join(" ") : null;
    }
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
};

/**
 * Shared request form: common fields, consent, honeypot, Turnstile, pending / success / error states.
 * Submits through `onSubmit` + a transition (not `<form action>`), so React doesn't reset the inputs
 * and everything typed survives an invalid or failed submit. A request id is made on the first submit
 * and reused on retries (the server ignores repeats); «Надіслати ще одну» starts a fresh one.
 */
export const LeadForm = ({
  kind,
  hiddenFields,
  title,
  description,
  messagePlaceholder,
  renderExtraFields,
  className,
}: LeadFormProps) => {
  const [state, formAction, isPending] = useActionState(submitSafely, initialLeadFormState);
  const [dismissed, setDismissed] = useState<LeadFormState | null>(null);
  const [round, setRound] = useState(0);
  const requestIdRef = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();
  const titleId = `${id}-title`;
  const messageId = `${id}-message`;

  const showSuccess = state.status === "ok" && state !== dismissed;
  const errors: LeadErrors = state.status === "invalid" ? state.fieldErrors : {};
  const message = formMessage(state);

  // Invalid: take the visitor to the first field to fix.
  useEffect(() => {
    if (state.status !== "invalid") return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]')?.focus();
  }, [state]);

  // «Надіслати ще одну»: the fresh form gets focus back.
  useEffect(() => {
    if (round === 0) return;
    formRef.current?.querySelector<HTMLElement>("input:not([tabindex='-1']), select, textarea")?.focus();
  }, [round]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;
    const formData = new FormData(event.currentTarget);
    requestIdRef.current ??= newRequestId();
    formData.set("kind", kind);
    formData.set("client_request_id", requestIdRef.current);
    formData.set("page_url", `${window.location.pathname}${window.location.search}`);
    formData.set("utm", utmFromLocation());
    for (const [key, value] of Object.entries(hiddenFields ?? {})) {
      if (value) formData.set(key, value);
    }
    startTransition(() => formAction(formData));
  };

  const handleAgain = () => {
    requestIdRef.current = null;
    setDismissed(state);
    setRound((value) => value + 1);
  };

  return (
    <div className={cn("flex min-w-0 flex-col gap-4", className)}>
      {title && (
        <div className="flex flex-col gap-1">
          <h2 id={titleId} className="text-lg font-bold text-balance">
            {title}
          </h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}

      {showSuccess ? (
        <LeadSuccess onAgain={handleAgain} />
      ) : (
        <form
          key={round}
          ref={formRef}
          noValidate
          onSubmit={handleSubmit}
          aria-labelledby={title ? titleId : undefined}
          aria-label={title ? undefined : "Заявка"}
          aria-busy={isPending}
          className="@container flex flex-col gap-4"
        >
          {renderExtraFields?.(errors)}
          <LeadFormFields errors={errors} messagePlaceholder={messagePlaceholder} />
          <ConsentField error={errors.consent} />
          <HoneypotField />
          <TurnstileWidget resetSignal={state} />

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
            {isPending ? "Надсилаємо заявку…" : ""}
          </p>
          <Button
            type="submit"
            size="lg"
            disabled={isPending}
            aria-describedby={message ? messageId : undefined}
            className="w-full @md:w-auto @md:self-start"
          >
            {isPending ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                Надсилаємо…
              </>
            ) : state.status === "error" ? (
              "Спробувати ще раз"
            ) : (
              "Надіслати заявку"
            )}
          </Button>
        </form>
      )}
    </div>
  );
};
