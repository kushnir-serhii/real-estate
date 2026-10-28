import "server-only";

import { z } from "zod";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 5000;

const responseSchema = z.object({ success: z.boolean() });

export type TurnstileConfig = {
  /** Empty / undefined = fixture mode: every token passes. */
  secret?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
};

/**
 * Checks a Turnstile token with Cloudflare. Empty secret = fixture mode (true).
 * Rejected token, network error, timeout or an unexpected answer all give `false`; the caller
 * shows one retryable message. Never logs the token or the IP.
 */
export const verifyTurnstileWith = async (
  config: TurnstileConfig,
  token: string,
  remoteIp?: string,
): Promise<boolean> => {
  const secret = (config.secret ?? "").trim();
  if (secret === "") return true;
  if (token.trim() === "") return false;

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);
  try {
    const response = await (config.fetch ?? fetch)(SITEVERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(config.timeoutMs ?? TIMEOUT_MS),
    });
    if (!response.ok) return false;
    const parsed = responseSchema.safeParse(await response.json());
    return parsed.success && parsed.data.success;
  } catch {
    return false;
  }
};

/** Secret is read on every call so tests and scripts can change env. */
export const verifyTurnstile = (token: string, remoteIp?: string): Promise<boolean> =>
  verifyTurnstileWith({ secret: process.env.TURNSTILE_SECRET_KEY }, token, remoteIp);
