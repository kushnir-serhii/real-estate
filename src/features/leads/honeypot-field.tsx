"use client";

import { useId } from "react";

import { HONEYPOT_FIELD } from "./lead-form-values";

/** Trap for bots: hidden from people and screen readers, must stay empty. */
export const HoneypotField = () => {
  // Unique per render: the chat lead card and a 006 form can share a page.
  const id = useId();
  return (
    <div aria-hidden="true" className="sr-only">
      <label htmlFor={id}>Не заповнюйте це поле</label>
      <input id={id} type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
    </div>
  );
};
