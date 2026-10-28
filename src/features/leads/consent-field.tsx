"use client";

import Link from "next/link";
import { useId } from "react";

import { FieldError } from "./field-error";

type ConsentFieldProps = { error?: string };

/** Required consent to personal data processing, with the privacy policy one tap away (new tab, so the form stays). */
export const ConsentField = ({ error }: ConsentFieldProps) => {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1">
      {/* The label next to the box toggles it too: together they make a large tap area */}
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          name="consent"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="mt-2.5 size-5 shrink-0 rounded accent-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:outline-2 aria-invalid:outline-destructive"
        />
        <label htmlFor={id} className="min-h-11 py-2.5 text-sm leading-snug">
          Я погоджуюся на{" "}
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener"
            className="rounded-sm text-primary underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            обробку персональних даних
            <span className="sr-only"> (відкриється в новій вкладці)</span>
          </Link>
        </label>
      </div>
      <FieldError id={errorId} message={error} />
    </div>
  );
};
