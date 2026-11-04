import { useSyncExternalStore } from "react";

/**
 * The chat's Turnstile token, between the widget (gives tokens) and the chat store (sends them).
 * Tokens are single-use: taking one resets the widget, which issues the next. Never stored.
 */

/** How long a message waits for the check before it shows «Не вдалося пройти перевірку». */
export const TURNSTILE_WAIT_MS = 60_000;

let token: string | null = null;
/** Bumped after a token is taken or a wait gave up: the widget resets on each change. */
let round = 0;
const waiters = new Set<(value: string) => void>();
const roundListeners = new Set<() => void>();

const nextRound = () => {
  round += 1;
  roundListeners.forEach((listener) => listener());
};

/** From the widget: a fresh token, or `null` when it expired / the check failed. */
export const setTurnstileToken = (value: string | null) => {
  if (value !== null && waiters.size > 0) {
    // Someone is waiting: the token goes straight to them and is used up.
    const [first] = waiters;
    waiters.delete(first);
    first(value);
    nextRound();
    return;
  }
  token = value;
};

/** The ready token, used up (the widget starts on the next one), or `null` when there is none yet. */
export const takeTurnstileToken = (): string | null => {
  const ready = token;
  if (ready === null) return null;
  token = null;
  nextRound();
  return ready;
};

/** Resolves with a token as soon as the widget gives one; `null` after the timeout or an abort. */
export const waitForTurnstileToken = (signal: AbortSignal, timeoutMs = TURNSTILE_WAIT_MS): Promise<string | null> => {
  const ready = takeTurnstileToken();
  if (ready !== null) return Promise.resolve(ready);
  return new Promise((resolve) => {
    const finish = (value: string | null) => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      waiters.delete(receive);
      resolve(value);
    };
    const receive = (value: string) => finish(value);
    const onAbort = () => finish(null);
    const timer = setTimeout(() => {
      finish(null);
      // The widget may be stuck: the next attempt starts it over.
      nextRound();
    }, timeoutMs);
    if (signal.aborted) {
      finish(null);
      return;
    }
    signal.addEventListener("abort", onAbort);
    waiters.add(receive);
  });
};

const subscribeRound = (listener: () => void) => {
  roundListeners.add(listener);
  return () => {
    roundListeners.delete(listener);
  };
};

const getRound = () => round;

/** For the widget's `resetSignal`. */
export const useTurnstileRound = (): number => useSyncExternalStore(subscribeRound, getRound, getRound);
