/** Max delivery attempts per channel; after the last failed one the lead is final (no next attempt). */
export const MAX_DELIVERY_ATTEMPTS = 5;

const MINUTE = 60_000;
/** Wait after failed attempt 1, 2, 3, 4: 5 min, 15 min, 1 h, 3 h. */
const BACKOFF_MS = [5 * MINUTE, 15 * MINUTE, 60 * MINUTE, 180 * MINUTE] as const;

/** A pending channel older than this lost its `after()` delivery (worker killed) and is picked up by cron. */
export const PENDING_STALE_MS = 10 * MINUTE;

/** When the next attempt is due after the failed attempt number `failedAttempts`; null = no more attempts. */
export const nextAttemptAt = (failedAttempts: number, now: Date): Date | null => {
  if (failedAttempts < 1 || failedAttempts >= MAX_DELIVERY_ATTEMPTS) return null;
  const wait = BACKOFF_MS[failedAttempts - 1];
  return wait === undefined ? null : new Date(now.getTime() + wait);
};
