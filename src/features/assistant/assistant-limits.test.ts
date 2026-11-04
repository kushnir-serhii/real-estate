import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_LIMITS,
  checkLimits,
  getClientIp,
  hashIp,
  isBudgetReached,
  isConversationFull,
  isRateLimited,
  readLimitsConfig,
  usageMonth,
} from "./assistant-limits";
import type { LimitsDeps } from "./assistant-limits";

const deps = (over: Partial<Record<"ip" | "conversation" | "cost", number>> = {}): LimitsDeps & { calls: string[] } => {
  const calls: string[] = [];
  return {
    calls,
    now: () => new Date("2026-11-04T12:00:00Z"),
    countByIp: vi.fn(async () => {
      calls.push("ip");
      return over.ip ?? 0;
    }),
    countInConversation: vi.fn(async () => {
      calls.push("conversation");
      return over.conversation ?? 0;
    }),
    monthCost: vi.fn(async () => {
      calls.push("cost");
      return over.cost ?? 0;
    }),
  };
};

const base = { message: "Привіт", ipHash: "h", conversationId: "c" };

describe("limit decisions", () => {
  it("rate: 20 stored means the 21st is refused", () => {
    expect(isRateLimited(19, DEFAULT_LIMITS)).toBe(false);
    expect(isRateLimited(20, DEFAULT_LIMITS)).toBe(true);
  });
  it("conversation: 30 stored means the 31st is refused", () => {
    expect(isConversationFull(29, DEFAULT_LIMITS)).toBe(false);
    expect(isConversationFull(30, DEFAULT_LIMITS)).toBe(true);
  });
  it("budget: reaching the cap refuses", () => {
    expect(isBudgetReached(19.99, DEFAULT_LIMITS)).toBe(false);
    expect(isBudgetReached(20, DEFAULT_LIMITS)).toBe(true);
  });
  it("usage month is the first day of the UTC month", () => {
    expect(usageMonth(new Date("2026-11-30T23:59:59Z"))).toBe("2026-11-01");
    expect(usageMonth(new Date("2026-12-01T00:00:00Z"))).toBe("2026-12-01");
  });
});

describe("readLimitsConfig", () => {
  it("defaults, env overrides, and ignores invalid values", () => {
    expect(readLimitsConfig({})).toEqual(DEFAULT_LIMITS);
    expect(
      readLimitsConfig({
        LLM_MONTHLY_BUDGET_USD: "5.5",
        ASSISTANT_RATE_LIMIT: "3",
        ASSISTANT_RATE_WINDOW_MIN: "1",
        ASSISTANT_CONVERSATION_LIMIT: "7",
      }),
    ).toEqual({ monthlyBudgetUsd: 5.5, rateLimit: 3, rateWindowMin: 1, conversationLimit: 7 });
    expect(
      readLimitsConfig({ LLM_MONTHLY_BUDGET_USD: "-1", ASSISTANT_RATE_LIMIT: "abc", ASSISTANT_CONVERSATION_LIMIT: "0" }),
    ).toEqual(DEFAULT_LIMITS);
  });
});

describe("checkLimits", () => {
  it("passes a normal message", async () => {
    expect(await checkLimits(base, DEFAULT_LIMITS, deps())).toBeNull();
  });

  it("1001 characters is too long, 1000 is fine; no DB call for the long one", async () => {
    const d = deps();
    expect(await checkLimits({ ...base, message: "a".repeat(1001) }, DEFAULT_LIMITS, d)).toBe("message_too_long");
    expect(d.calls).toEqual([]);
    expect(await checkLimits({ ...base, message: "a".repeat(1000) }, DEFAULT_LIMITS, deps())).toBeNull();
  });

  it("21st message in the window → rate_limit; the window is passed to the query", async () => {
    const d = deps({ ip: 20 });
    expect(await checkLimits(base, DEFAULT_LIMITS, d)).toBe("rate_limit");
    expect(d.countByIp).toHaveBeenCalledWith("h", "2026-11-04T11:50:00.000Z");
  });

  it("31st message in a conversation → conversation_limit; a new conversation has no cap query", async () => {
    expect(await checkLimits(base, DEFAULT_LIMITS, deps({ conversation: 30 }))).toBe("conversation_limit");
    const d = deps({ conversation: 99 });
    expect(await checkLimits({ ...base, conversationId: undefined }, DEFAULT_LIMITS, d)).toBeNull();
    expect(d.countInConversation).not.toHaveBeenCalled();
  });

  it("budget reached → budget", async () => {
    expect(await checkLimits(base, DEFAULT_LIMITS, deps({ cost: 20 }))).toBe("budget");
  });

  it("order: length, rate, conversation, budget; later checks are skipped after a refusal", async () => {
    const all = deps({ ip: 99, conversation: 99, cost: 99 });
    expect(await checkLimits({ ...base, message: "a".repeat(2000) }, DEFAULT_LIMITS, all)).toBe("message_too_long");
    expect(await checkLimits(base, DEFAULT_LIMITS, all)).toBe("rate_limit");
    expect(all.calls).toEqual(["ip"]);
    const noRate = deps({ conversation: 99, cost: 99 });
    expect(await checkLimits(base, DEFAULT_LIMITS, noRate)).toBe("conversation_limit");
    expect(noRate.calls).toEqual(["ip", "conversation"]);
  });

  it("a retry skips the message caps but not the budget", async () => {
    const d = deps({ ip: 99, conversation: 99 });
    expect(await checkLimits({ ...base, isRetry: true }, DEFAULT_LIMITS, d)).toBeNull();
    expect(d.calls).toEqual(["cost"]);
    expect(await checkLimits({ ...base, isRetry: true }, DEFAULT_LIMITS, deps({ cost: 20 }))).toBe("budget");
  });
});

describe("client IP and hashing", () => {
  it("prefers cf-connecting-ip, then the first x-forwarded-for entry", () => {
    expect(getClientIp(new Headers({ "cf-connecting-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2" }))).toBe("1.1.1.1");
    expect(getClientIp(new Headers({ "x-forwarded-for": "2.2.2.2, 3.3.3.3" }))).toBe("2.2.2.2");
    expect(getClientIp(new Headers())).toBeUndefined();
  });

  it("hashes with the salt, deterministically, without leaking the address", async () => {
    const a = await hashIp("203.0.113.7", "salt-a");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain("203.0.113.7");
    expect(await hashIp("203.0.113.7", "salt-a")).toBe(a);
    expect(await hashIp("203.0.113.7", "salt-b")).not.toBe(a);
    expect(await hashIp("203.0.113.8", "salt-a")).not.toBe(a);
  });

  it("an empty salt uses the dev salt and warns at most once", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const first = await hashIp("203.0.113.7", "");
    await hashIp("203.0.113.7", "  ");
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(warn.mock.calls.length).toBeLessThanOrEqual(1);
    warn.mockRestore();
  });
});
