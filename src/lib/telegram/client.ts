import "server-only";

import { z } from "zod";

import { TelegramError } from "./errors";

const TELEGRAM_API = "https://api.telegram.org";
const TIMEOUT_MS = 10_000;

export const TELEGRAM_FIXTURE_MODES = ["ok", "fail"] as const;
export type TelegramFixtureMode = (typeof TELEGRAM_FIXTURE_MODES)[number];

export const parseTelegramFixtureMode = (value: string | undefined): TelegramFixtureMode | null => {
  const wanted = (value ?? "").trim().toLowerCase();
  return TELEGRAM_FIXTURE_MODES.find((mode) => mode === wanted) ?? null;
};

const answerSchema = z.object({ ok: z.literal(true) });

export type TelegramConfig = {
  botToken?: string;
  chatId?: string;
  /** Local transport (`TELEGRAM_FIXTURE`): wins over real keys. */
  fixture?: TelegramFixtureMode | null;
  timeoutMs?: number;
  fetch?: typeof fetch;
};

/** `off` = nothing configured (the caller marks the channel `skipped`). */
export type TelegramMode = "off" | "live" | { fixture: TelegramFixtureMode };

export const resolveTelegramMode = (config: TelegramConfig): TelegramMode => {
  if (config.fixture) return { fixture: config.fixture };
  const configured = (config.botToken ?? "").trim() !== "" && (config.chatId ?? "").trim() !== "";
  return configured ? "live" : "off";
};

const configFromEnv = (): TelegramConfig => ({
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  chatId: process.env.TELEGRAM_MANAGER_CHAT_ID,
  fixture: parseTelegramFixtureMode(process.env.TELEGRAM_FIXTURE),
});

/** Whether a message would go anywhere (live or fixture). Read on every call. */
export const isTelegramConfigured = (): boolean => resolveTelegramMode(configFromEnv()) !== "off";

export const getTelegramMode = (): TelegramMode => resolveTelegramMode(configFromEnv());

/**
 * Sends an HTML message to the managers' chat. No automatic retry (a repeat could double the message;
 * the lead cron retries). The text is never logged.
 */
export const sendTelegramMessageWith = async (config: TelegramConfig, input: { text: string }): Promise<void> => {
  const mode = resolveTelegramMode(config);
  if (mode === "off") throw new TelegramError({ kind: "api", message: "not configured" });
  if (mode !== "live") {
    if (mode.fixture === "fail") throw new TelegramError({ kind: "api", message: "fixture: send failed" });
    console.info(`[telegram fixture] message would be sent (${input.text.length} chars)`);
    return;
  }

  const fetchImpl = config.fetch ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl(`${TELEGRAM_API}/bot${(config.botToken ?? "").trim()}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: (config.chatId ?? "").trim(),
        text: input.text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(config.timeoutMs ?? TIMEOUT_MS),
    });
  } catch (error) {
    // Only the error name: the message can contain the URL with the token.
    throw new TelegramError({ kind: "network", message: `request failed (${error instanceof Error ? error.name : "unknown"})` });
  }
  if (!response.ok) {
    throw new TelegramError({ kind: "http", message: `HTTP ${response.status}`, status: response.status });
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new TelegramError({ kind: "invalid_response", message: "response is not valid JSON" });
  }
  if (!answerSchema.safeParse(body).success) {
    throw new TelegramError({ kind: "invalid_response", message: "answer is not ok: true" });
  }
};

export const sendTelegramMessage = (input: { text: string }): Promise<void> =>
  sendTelegramMessageWith(configFromEnv(), input);
