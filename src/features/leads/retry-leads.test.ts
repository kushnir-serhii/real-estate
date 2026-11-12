import { describe, expect, it, vi } from "vitest";

import type { LeadDeliveryUpdate, LeadForDelivery, LeadToAlert } from "@/lib/db/leads";
import { deliverLeadWith, retryLeadChannelWith, type DeliverLeadDeps, type DeliveryResult } from "./deliver-lead";
import { retryLeadsWith, type RetryLeadsDeps } from "./retry-leads";
import { MAX_DELIVERY_ATTEMPTS, SKIPPED_REQUEUE_DAYS } from "./retry-schedule";

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
  plektanMode: () => "off",
  requeueSkipped: vi.fn(async () => 0),
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

type SkipLead = LeadForDelivery & { created_at: Date; plektan_next_attempt_at: string | null };

/** The real delivery code and the real cron rules over one in-memory table; only the I/O is faked. */
const skippedWorld = (leads: SkipLead[], modes: { plektan: "off" | "live"; telegram: "off" | "live" }) => {
  const find = (id: string) => leads.find((l) => l.id === id);
  const sendToTelegram = vi.fn(async () => undefined);
  const sendToPlektan = vi.fn(async () => ({ itemId: "9" }));
  const delivery: DeliverLeadDeps = {
    loadLead: async (id) => find(id) ?? null,
    saveDelivery: async (id, u: LeadDeliveryUpdate) => {
      const l = find(id);
      if (!l) return;
      if (u.channel === "plektan") {
        l.plektan_status = u.status;
        l.plektan_attempts = u.attempts;
      } else {
        l.telegram_status = u.status;
        l.telegram_attempts = u.attempts;
      }
    },
    plektanMode: () => modes.plektan,
    sendToPlektan,
    telegramMode: () => modes.telegram,
    sendToTelegram,
    siteUrl: () => undefined,
    now: () => now,
  };
  const deps = fakeDeps([], {
    plektanMode: () => modes.plektan,
    telegramMode: () => modes.telegram,
    requeueSkipped: async ({ channel, createdAfter }) => {
      let n = 0;
      for (const l of leads) {
        if (l.created_at < createdAfter) continue;
        if (channel === "telegram" && l.telegram_status === "skipped") {
          l.telegram_status = "pending";
          n++;
        }
        if (channel === "plektan" && l.plektan_status === "skipped") {
          l.plektan_status = "pending";
          n++;
        }
      }
      return n;
    },
    getDueIds: async ({ staleBefore }) =>
      leads
        .filter((l) => (l.plektan_status === "pending" || l.telegram_status === "pending") && l.created_at < staleBefore)
        .map((l) => l.id),
    deliver: (id) => deliverLeadWith(delivery, id),
    getToAlert: async () => [],
  });
  return { delivery, deps, sendToTelegram, sendToPlektan };
};

const skipLead = (daysOld: number, over: Partial<SkipLead> = {}): SkipLead => ({
  id: "s1",
  kind: "general",
  name: "Іван",
  phone: "+380501234567",
  email: null,
  message: null,
  payload: { deal: "buy" },
  page_url: null,
  plektan_status: "sent",
  plektan_attempts: 1,
  telegram_status: "skipped",
  telegram_attempts: 0,
  property: null,
  created_at: new Date(now.getTime() - daysOld * 24 * 60 * 60_000),
  plektan_next_attempt_at: null,
  ...over,
});

describe("skipped leads once the channel is on", () => {
  it("a 2-day-old skipped Telegram channel is sent by one cron run, attempts = 1; a sent Plektan is not sent again", async () => {
    const leads = [skipLead(2)];
    const world = skippedWorld(leads, { plektan: "live", telegram: "live" });
    await retryLeadsWith(world.deps);
    expect(leads[0]).toMatchObject({ telegram_status: "sent", telegram_attempts: 1, plektan_status: "sent", plektan_attempts: 1 });
    expect(world.sendToTelegram).toHaveBeenCalledTimes(1);
    expect(world.sendToPlektan).not.toHaveBeenCalled();
  });

  it(`a lead older than ${SKIPPED_REQUEUE_DAYS} days stays skipped in cron, the manual send delivers it`, async () => {
    const leads = [skipLead(SKIPPED_REQUEUE_DAYS + 1)];
    const world = skippedWorld(leads, { plektan: "live", telegram: "live" });
    await retryLeadsWith(world.deps);
    expect(leads[0]).toMatchObject({ telegram_status: "skipped", telegram_attempts: 0 });
    expect(world.sendToTelegram).not.toHaveBeenCalled();

    expect(await retryLeadChannelWith(world.delivery, "s1", "telegram")).toEqual({ found: true, outcome: "sent" });
    expect(leads[0]).toMatchObject({ telegram_status: "sent", telegram_attempts: 1 });
  });

  it("a channel that is still off is left alone by cron and manual send, with no attempt counted", async () => {
    const leads = [skipLead(2)];
    const world = skippedWorld(leads, { plektan: "live", telegram: "off" });
    const requeue = vi.spyOn(world.deps, "requeueSkipped");
    await retryLeadsWith(world.deps);
    expect(requeue).not.toHaveBeenCalledWith(expect.objectContaining({ channel: "telegram" }));
    expect(leads[0]).toMatchObject({ telegram_status: "skipped", telegram_attempts: 0 });

    expect(await retryLeadChannelWith(world.delivery, "s1", "telegram")).toEqual({ found: true, outcome: "skipped" });
    expect(leads[0]).toMatchObject({ telegram_status: "skipped", telegram_attempts: 0 });
    expect(world.sendToTelegram).not.toHaveBeenCalled();
  });

  it("the channels are independent: only the one that is on is requeued", async () => {
    const leads = [skipLead(1, { plektan_status: "skipped", plektan_attempts: 0 })];
    const world = skippedWorld(leads, { plektan: "off", telegram: "live" });
    await retryLeadsWith(world.deps);
    expect(leads[0]).toMatchObject({ telegram_status: "sent", plektan_status: "skipped", plektan_attempts: 0 });
    expect(world.sendToPlektan).not.toHaveBeenCalled();
  });
});
