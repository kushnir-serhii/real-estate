import { describe, expect, it, vi } from "vitest";

import type { LeadDeliveryUpdate, LeadForDelivery } from "@/lib/db/leads";
import { PlektanError } from "@/lib/plektan";
import { TelegramError } from "@/lib/telegram";
import { deliverLeadWith, type DeliverLeadDeps } from "./deliver-lead";

const baseLead: LeadForDelivery = {
  id: "l1",
  kind: "general",
  name: "Іван",
  phone: "+380501234567",
  email: null,
  message: null,
  payload: { deal: "buy" },
  page_url: null,
  plektan_status: "pending",
  plektan_attempts: 0,
  telegram_status: "pending",
  telegram_attempts: 0,
  property: null,
};

const setup = (over: Partial<DeliverLeadDeps> = {}, lead: LeadForDelivery | null = baseLead) => {
  const saved: LeadDeliveryUpdate[] = [];
  const deps: DeliverLeadDeps = {
    loadLead: async () => lead,
    saveDelivery: async (_id, update) => {
      saved.push(update);
    },
    plektanMode: () => "live",
    sendToPlektan: vi.fn(async () => ({ itemId: "777" })),
    telegramMode: () => "live",
    sendToTelegram: vi.fn(async () => undefined),
    siteUrl: () => undefined,
    ...over,
  };
  return { deps, saved };
};

describe("deliverLeadWith", () => {
  it("records both channels as sent with the Plektan item id", async () => {
    const { deps, saved } = setup();
    expect(await deliverLeadWith(deps, "l1")).toEqual({ found: true, plektan: "sent", telegram: "sent" });
    expect(saved).toContainEqual({ channel: "plektan", status: "sent", error: null, attempts: 1, itemId: "777" });
    expect(saved).toContainEqual({ channel: "telegram", status: "sent", error: null, attempts: 1 });
  });

  it("a Plektan error leaves plektan failed and Telegram still goes out", async () => {
    const { deps, saved } = setup({
      sendToPlektan: async () => {
        throw new PlektanError({ kind: "api", message: "echoes +380501234567" });
      },
    });
    expect(await deliverLeadWith(deps, "l1")).toMatchObject({ plektan: "failed", telegram: "sent" });
    expect(deps.sendToTelegram).toHaveBeenCalledTimes(1);
    expect(saved.find((update) => update.channel === "plektan")).toEqual({
      channel: "plektan",
      status: "failed",
      error: "api",
      attempts: 1,
    });
  });

  it("a Telegram error does not stop Plektan and keeps no details", async () => {
    const { deps, saved } = setup({
      sendToTelegram: async () => {
        throw new TelegramError({ kind: "http", message: "HTTP 502", status: 502 });
      },
    });
    expect(await deliverLeadWith(deps, "l1")).toMatchObject({ plektan: "sent", telegram: "failed" });
    expect(saved).toContainEqual({ channel: "telegram", status: "failed", error: "http 502", attempts: 1 });
  });

  it("marks both channels skipped when nothing is configured, without counting an attempt", async () => {
    const { deps, saved } = setup({ plektanMode: () => "off", telegramMode: () => "off" });
    expect(await deliverLeadWith(deps, "l1")).toEqual({ found: true, plektan: "skipped", telegram: "skipped" });
    expect(deps.sendToPlektan).not.toHaveBeenCalled();
    expect(deps.sendToTelegram).not.toHaveBeenCalled();
    expect(saved.every((update) => update.status === "skipped" && update.attempts === 0)).toBe(true);
  });

  it("retries only failed channels and counts attempts", async () => {
    const { deps, saved } = setup(
      {},
      { ...baseLead, plektan_status: "failed", plektan_attempts: 2, telegram_status: "sent", telegram_attempts: 1 },
    );
    expect(await deliverLeadWith(deps, "l1")).toMatchObject({ plektan: "sent", telegram: "not_due" });
    expect(deps.sendToTelegram).not.toHaveBeenCalled();
    expect(saved).toEqual([{ channel: "plektan", status: "sent", error: null, attempts: 3, itemId: "777" }]);
  });

  it("reports a missing lead", async () => {
    const { deps } = setup({}, null);
    expect(await deliverLeadWith(deps, "nope")).toMatchObject({ found: false });
  });
});
