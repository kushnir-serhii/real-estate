import "server-only";

import {
  countUserMessages,
  countUserMessagesByIp,
  getMonthCostUsd,
} from "@/lib/db/assistant";

import { ASSISTANT_MESSAGE_MAX_LENGTH } from "./assistant-events";
import type { AssistantLimitReason } from "./assistant-events";

export type AssistantLimitsConfig = {
  monthlyBudgetUsd: number;
  /** Visitor messages allowed per IP in the window. */
  rateLimit: number;
  rateWindowMin: number;
  /** Visitor messages allowed in one conversation. */
  conversationLimit: number;
};

export const DEFAULT_LIMITS: AssistantLimitsConfig = {
  monthlyBudgetUsd: 20,
  rateLimit: 20,
  rateWindowMin: 10,
  conversationLimit: 30,
};

const positiveNumber = (raw: string | undefined, fallback: number, integer: boolean): number => {
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return integer ? Math.floor(value) || fallback : value;
};

/** Limits from env; empty or invalid values fall back to the defaults. */
export const readLimitsConfig = (env: Record<string, string | undefined> = process.env): AssistantLimitsConfig => ({
  monthlyBudgetUsd: positiveNumber(env.LLM_MONTHLY_BUDGET_USD, DEFAULT_LIMITS.monthlyBudgetUsd, false),
  rateLimit: positiveNumber(env.ASSISTANT_RATE_LIMIT, DEFAULT_LIMITS.rateLimit, true),
  rateWindowMin: positiveNumber(env.ASSISTANT_RATE_WINDOW_MIN, DEFAULT_LIMITS.rateWindowMin, true),
  conversationLimit: positiveNumber(env.ASSISTANT_CONVERSATION_LIMIT, DEFAULT_LIMITS.conversationLimit, true),
});

/* Pure decisions. `stored` counts what is already saved, so the refused message is the next one. */
export const isMessageTooLong = (message: string): boolean => message.length > ASSISTANT_MESSAGE_MAX_LENGTH;
export const isRateLimited = (storedInWindow: number, config: AssistantLimitsConfig): boolean =>
  storedInWindow >= config.rateLimit;
export const isConversationFull = (storedInConversation: number, config: AssistantLimitsConfig): boolean =>
  storedInConversation >= config.conversationLimit;
export const isBudgetReached = (monthCostUsd: number, config: AssistantLimitsConfig): boolean =>
  monthCostUsd >= config.monthlyBudgetUsd;

/** First day of the UTC month, `YYYY-MM-01`: the `ai_usage` key. */
export const usageMonth = (date: Date): string => `${date.toISOString().slice(0, 7)}-01`;

export type LimitsDeps = {
  countByIp: (ipHash: string, sinceIso: string) => Promise<number>;
  countInConversation: (conversationId: string) => Promise<number>;
  monthCost: (month: string) => Promise<number>;
  now: () => Date;
};

const defaultDeps: LimitsDeps = {
  countByIp: countUserMessagesByIp,
  countInConversation: countUserMessages,
  monthCost: getMonthCostUsd,
  now: () => new Date(),
};

export type LimitCheckInput = {
  message: string;
  ipHash: string;
  /** Set for an existing conversation only. */
  conversationId?: string;
  /** A retry of an already stored message: it is already counted, so the message caps are skipped. */
  isRetry?: boolean;
};

/**
 * Checks in order, stopping at the first refusal (so later, costlier queries are skipped):
 * message length → IP rate → conversation size → monthly budget. Turnstile is checked by the caller.
 * Throws when the database fails: the caller answers with a generic error, never lets the message through.
 */
export const checkLimits = async (
  input: LimitCheckInput,
  config: AssistantLimitsConfig = readLimitsConfig(),
  deps: LimitsDeps = defaultDeps,
): Promise<AssistantLimitReason | null> => {
  if (isMessageTooLong(input.message)) return "message_too_long";
  const now = deps.now();
  if (!input.isRetry) {
    const since = new Date(now.getTime() - config.rateWindowMin * 60_000).toISOString();
    if (isRateLimited(await deps.countByIp(input.ipHash, since), config)) return "rate_limit";
    if (input.conversationId && isConversationFull(await deps.countInConversation(input.conversationId), config)) {
      return "conversation_limit";
    }
  }
  if (isBudgetReached(await deps.monthCost(usageMonth(now)), config)) return "budget";
  return null;
};

/* Visitor IP and its salted hash. */

/** `cf-connecting-ip`, else the first `x-forwarded-for` entry; undefined when neither is present. */
export const getClientIp = (headers: Pick<Headers, "get">): string | undefined => {
  const direct = headers.get("cf-connecting-ip")?.trim();
  if (direct) return direct;
  const first = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first ? first : undefined;
};

const DEV_SALT = "diplomat-hall-dev-ip-salt";
let warnedAboutSalt = false;

const hex = (bytes: ArrayBuffer): string =>
  Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");

/** SHA-256(salt + ip) as hex (Web Crypto). The raw address is never stored or logged. No address → one shared bucket. */
export const hashIp = async (ip: string | undefined, salt: string | undefined = process.env.ASSISTANT_IP_SALT): Promise<string> => {
  let usedSalt = (salt ?? "").trim();
  if (usedSalt === "") {
    if (!warnedAboutSalt) {
      warnedAboutSalt = true;
      console.warn("[assistant] ASSISTANT_IP_SALT is empty: using a fixed development salt");
    }
    usedSalt = DEV_SALT;
  }
  const data = new TextEncoder().encode(`${usedSalt}${ip ?? "unknown"}`);
  return hex(await crypto.subtle.digest("SHA-256", data));
};
