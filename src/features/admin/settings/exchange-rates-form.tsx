"use client";

import { CircleAlert, CircleCheck, LoaderCircle, Save } from "lucide-react";
import { useActionState, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ExchangeRates } from "@/lib/db/settings";
import { saveExchangeRatesAction } from "./actions";
import { countObjects } from "@/lib/format/count-objects";
import { INITIAL_SAVE_RATES_STATE } from "./settings-state";
import type { RatesFieldErrors } from "./settings-state";

type ExchangeRatesFormProps = { rates: ExchangeRates };

type RateField = keyof RatesFieldErrors;

const FIELDS: readonly { name: RateField; label: string; placeholder: string }[] = [
  { name: "UAH", label: "Гривень за 1 USD", placeholder: "41,5" },
  { name: "EUR", label: "Євро за 1 USD", placeholder: "0,92" },
];

/** 41.5 -> «41,5» (uk-UA decimal comma, no grouping, so it parses back). */
const RATE_FORMAT = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 6, useGrouping: false });

export const ExchangeRatesForm = ({ rates }: ExchangeRatesFormProps) => {
  const id = useId();
  const hintId = `${id}-hint`;
  // Controlled: React resets uncontrolled forms after an action, which would drop invalid input.
  const [values, setValues] = useState<Record<RateField, string>>({
    UAH: RATE_FORMAT.format(rates.UAH),
    EUR: RATE_FORMAT.format(rates.EUR),
  });
  const [state, formAction, pending] = useActionState(saveExchangeRatesAction, INITIAL_SAVE_RATES_STATE);
  const inputRefs = useRef<Partial<Record<RateField, HTMLInputElement | null>>>({});

  const errors: RatesFieldErrors = state.status === "invalid" ? state.errors : {};

  // Move the focus to the first field to fix.
  useEffect(() => {
    if (state.status !== "invalid") return;
    const first = FIELDS.find((f) => state.errors[f.name]);
    if (first) inputRefs.current[first.name]?.focus();
  }, [state]);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <p id={hintId} className="max-w-prose text-sm text-muted-foreground">
        Скільки гривень і євро коштує 1 долар. За цими курсами ціни всіх об&apos;єктів перераховуються в долари —
        так працює фільтр за ціною в каталозі. Після збереження ціни перерахуються одразу.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
        {FIELDS.map((field) => {
          const inputId = `${id}-${field.name}`;
          const errorId = `${inputId}-error`;
          const error = errors[field.name];
          return (
            <div key={field.name} className="flex min-w-0 flex-col gap-2">
              <Label htmlFor={inputId}>{field.label}</Label>
              <Input
                ref={(el) => {
                  inputRefs.current[field.name] = el;
                }}
                id={inputId}
                name={field.name}
                inputMode="decimal"
                autoComplete="off"
                placeholder={field.placeholder}
                value={values[field.name]}
                onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${errorId} ${hintId}` : hintId}
                className="tabular-nums"
              />
              {error && (
                <p id={errorId} className="flex items-start gap-1.5 text-sm font-medium wrap-anywhere text-destructive">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col items-start gap-3">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
          {pending ? "Зберігаємо…" : "Зберегти курси"}
        </Button>

        <p role="status" className="flex items-start gap-1.5 text-sm font-medium wrap-anywhere empty:hidden">
          {pending
            ? null
            : state.status === "saved" && (
                <span className="flex items-start gap-1.5 text-success">
                  <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {state.recomputed === 0
                    ? "Збережено. Ціни об'єктів уже відповідали цим курсам."
                    : `Збережено. Перераховано ціни: ${countObjects(state.recomputed)}.`}
                </span>
              )}
        </p>

        {!pending && (state.status === "error" || state.status === "invalid") && (
          <p role="alert" className="flex items-start gap-1.5 text-sm font-medium wrap-anywhere text-destructive">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {state.status === "error" ? state.message : "Не збережено: виправте позначені поля."}
          </p>
        )}
      </div>
    </form>
  );
};
