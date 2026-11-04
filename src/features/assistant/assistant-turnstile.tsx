"use client";

import { useEffect } from "react";

import { TurnstileWidget } from "@/features/leads/turnstile-widget";
import { setTurnstileToken, useTurnstileRound } from "./assistant-turnstile-token";

/**
 * The chat's Turnstile check, mounted only while the next message needs a token (new conversation or a
 * failed check). Invisible unless Cloudflare asks the visitor to click; the token goes to the chat store.
 */
export const AssistantTurnstile = () => {
  const round = useTurnstileRound();

  // A token from a removed widget isn't kept: the next mount issues its own.
  useEffect(() => () => setTurnstileToken(null), []);

  return (
    <TurnstileWidget
      resetSignal={round}
      onToken={setTurnstileToken}
      appearance="interaction-only"
      responseField={false}
      className="min-h-0 shrink-0 px-3"
    />
  );
};
