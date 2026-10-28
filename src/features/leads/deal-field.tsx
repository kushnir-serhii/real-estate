"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";
import { FieldError } from "./field-error";
import type { LeadDeal } from "./lead-form-schema";

const DEAL_OPTIONS: readonly { value: LeadDeal; label: string }[] = [
  { value: "buy", label: "Купити" },
  { value: "rent", label: "Орендувати" },
];

type DealFieldProps = { defaultDeal?: LeadDeal; error?: string };

/** «Купити» / «Орендувати» as a two-part switch built on native radios (keyboard: arrows). */
export const DealField = ({ defaultDeal, error }: DealFieldProps) => {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="mb-2 text-sm leading-none font-medium">Що вас цікавить</legend>
      <div
        className={cn("grid grid-cols-2 gap-1 rounded-lg bg-muted p-1", error && "ring-2 ring-destructive")}
      >
        {DEAL_OPTIONS.map((option) => (
          <label
            key={option.value}
            className="flex min-h-11 items-center justify-center rounded-md px-3 text-base font-medium text-muted-foreground transition-colors hover:text-foreground has-checked:bg-background has-checked:text-foreground has-checked:shadow-sm has-checked:ring-1 has-checked:ring-foreground/10 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
          >
            <input
              type="radio"
              name="deal"
              value={option.value}
              defaultChecked={option.value === defaultDeal}
              // radios don't take aria-invalid: the error is linked by describedby, data-invalid marks it for focus
              data-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
      <FieldError id={errorId} message={error} />
    </fieldset>
  );
};
