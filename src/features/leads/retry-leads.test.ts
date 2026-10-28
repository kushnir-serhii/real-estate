import { describe, expect, it, vi } from "vitest";

import type { LeadToAlert } from "@/lib/db/leads";
import type { DeliveryResult } from "./deliver-lead";
import { retryLeadsWith, type RetryLeadsDeps } from "./retry-leads";
import { MAX_DELIVERY_ATTEMPTS } from "./retry-schedule";

const now = new Date("2026-10-28T12:00:00.000Z");
const sentBoth: DeliveryResult = { found: true, plektan: "sent", telegram: "sent" };

type FakeLead = {
  id: string;
  created_at: Date;
  plektan_status: "pending" | "failed" | "sent";
  plektan_attempts: number;
  plektan_next_attempt_at: Date | null;
  plektan_alerted_at: Date | null;
};

/** In-memory stand-in for the DB queries, applying the same rules as the SQL. */
const fakeDeps = (leads: FakeLead[], overrides: Partial<RetryLeadsDeps> = {}): RetryLeadsDeps => ({
  now: () => now,
  getDueIds: async ({ now: at, staleBefore, maxAttempts }) =>
    leads
      .filter(
        (l) =>
          (l.plektan_status === "failed" &&
            l.plektan_attempts < maxAttempts &&
            l.plektan_next_attempt_at !== null &&
            l.plektan_next_attempt_at <= at) ||
          (l.plektan_status === "pending" && l.created_at < staleBefore),
      )
      .map((l) => l.id),
  deliver: vi.fn(async (id: string) => {
    const found = leads.find((l) => l.id === id);
    if (found) {
      found.plektan_status = "sent";
      found.plektan_next_attempt_at = null;
    }
    return sentBoth;
  }),
  getToAlert: async ({ maxAttempts }): Promise<LeadToAlert[]> =>
    leads
      .filter((l) => l.plektan_status === "failed" && l.plektan_attempts >= maxAttempts && !l.plektan_alerted_at)
      .map((l) => ({ id: l.id, name: "Іван", phone: "+380501234567" })),
  markAlerted: async (id, at) => {
    const found = leads.find((l) => l.id === id);
    if (found) found.plektan_alerted_at = at;
  },
  telegramMode: () => "live",
  sendAlert: vi.fn(async () => undefined),
  ...overrides,
});

const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000);

const lead = (over: Partial<FakeLead>): FakeLead => ({
  id: "l1",
  created_at: minutesAgo(60),
  plektan_status: "failed",
  plektan_attempts: 1,
  plektan_next_attempt_at: new Date(now.getTime() - 1000),
  plektan_alerted_at: null,
  ...over,
});

const exhausted = () => lead({ plektan_attempts: MAX_DELIVERY_ATTEMPTS, plektan_next_attempt_at: null });

describe("retryLeadsWith", () => {
  it("delivers a failed lead once it is due", async () => {
    const leads = [lead({})];
    expect(await retryLeadsWith(fakeDeps(leads))).toEqual({ processed: 1, sent: 2, failed: 0, alerts: 0 });
    expect(leads[0]?.plektan_status).toBe("sent");
  });

  it("does not retry before next_attempt_at", async () => {
    const deps = fakeDeps([lead({ plektan_next_attempt_at: new Date(now.getTime() + 60_000) })]);
    expect((await retryLeadsWith(deps)).processed).toBe(0);
    expect(deps.deliver).not.toHaveBeenCalled();
  });

  it("does not retry after the last attempt", async () => {
    expect((await retryLeadsWith(fakeDeps([exhausted()]))).processed).toBe(0);
  });

  it("picks up pending leads older than 10 minutes but not fresh ones", async () => {
    const pending = { plektan_status: "pending", plektan_next_attempt_at: null } as const;
    const deps = fakeDeps([
      lead({ id: "old", created_at: minutesAgo(11), ...pending }),
      lead({ id: "new", created_at: minutesAgo(2), ...pending }),
    ]);
    expect((await retryLeadsWith(deps)).processed).toBe(1);
    expect(deps.deliver).toHaveBeenCalledWith("old");
  });

  it("one crashing lead does not stop the run", async () => {
    const deps = fakeDeps([lead({ id: "bad" }), lead({ id: "good" })], {
      deliver: vi.fn(async (id: string) => {
        if (id === "bad") throw new Error("db down");
        return sentBoth;
      }),
    });
    expect(await retryLeadsWith(deps)).toMatchObject({ processed: 2, sent: 2, failed: 1 });
  });

  it("sends the alert once for an exhausted lead", async () => {
    const leads = [exhausted()];
    const deps = fakeDeps(leads);
    expect((await retryLeadsWith(deps)).alerts).toBe(1);
    expect((await retryLeadsWith(deps)).alerts).toBe(0);
    expect(deps.sendAlert).toHaveBeenCalledTimes(1);
    expect(leads[0]?.plektan_alerted_at).toEqual(now);
  });

  it("leaves the alert for later when Telegram is off", async () => {
    const leads = [exhausted()];
    const deps = fakeDeps(leads, { telegramMode: () => "off" });
    expect((await retryLeadsWith(deps)).alerts).toBe(0);
    expect(leads[0]?.plektan_alerted_at).toBeNull();
  });

  it("keeps the alert pending when sending fails", async () => {
    const leads = [exhausted()];
    const deps = fakeDeps(leads, {
      sendAlert: async () => {
        throw new Error("telegram down");
      },
    });
    expect((await retryLeadsWith(deps)).alerts).toBe(0);
    expect(leads[0]?.plektan_alerted_at).toBeNull();
  });
});
