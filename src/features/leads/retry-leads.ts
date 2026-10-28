import "server-only";

import { getDueLeadIds, getLeadsToAlert, markPlektanAlerted, type LeadToAlert } from "@/lib/db/leads";
import { getTelegramMode, sendTelegramMessage, type TelegramMode } from "@/lib/telegram";
import { deliverLead, type DeliveryResult } from "./deliver-lead";
import { buildPlektanAlertText } from "./lead-delivery-content";
import { MAX_DELIVERY_ATTEMPTS, PENDING_STALE_MS } from "./retry-schedule";

const RUN_LIMIT = 50;

export type RetryCounts = { processed: number; sent: number; failed: number; alerts: number };

export type RetryLeadsDeps = {
  now: () => Date;
  getDueIds: (params: { now: Date; staleBefore: Date; maxAttempts: number; limit: number }) => Promise<string[]>;
  deliver: (id: string) => Promise<DeliveryResult>;
  getToAlert: (params: { maxAttempts: number; limit: number }) => Promise<LeadToAlert[]>;
  markAlerted: (id: string, at: Date) => Promise<void>;
  telegramMode: () => TelegramMode;
  sendAlert: (text: string) => Promise<void>;
};

const defaultDeps: RetryLeadsDeps = {
  now: () => new Date(),
  getDueIds: getDueLeadIds,
  deliver: deliverLead,
  getToAlert: getLeadsToAlert,
  markAlerted: markPlektanAlerted,
  telegramMode: getTelegramMode,
  sendAlert: (text) => sendTelegramMessage({ text }),
};

/**
 * One cron run: delivers due leads one by one (a bad lead never stops the run), then sends one
 * Telegram alert per lead whose Plektan delivery ran out of attempts. Returns counts only.
 */
export const retryLeadsWith = async (deps: RetryLeadsDeps): Promise<RetryCounts> => {
  const now = deps.now();
  const ids = await deps.getDueIds({
    now,
    staleBefore: new Date(now.getTime() - PENDING_STALE_MS),
    maxAttempts: MAX_DELIVERY_ATTEMPTS,
    limit: RUN_LIMIT,
  });

  const counts: RetryCounts = { processed: 0, sent: 0, failed: 0, alerts: 0 };
  for (const id of ids) {
    counts.processed += 1;
    try {
      const result = await deps.deliver(id);
      for (const outcome of [result.plektan, result.telegram]) {
        if (outcome === "sent") counts.sent += 1;
        if (outcome === "failed") counts.failed += 1;
      }
    } catch {
      // Database trouble for this lead only; it stays due and the next run tries again.
      counts.failed += 1;
      console.error("[leads-retry] delivery crashed for one lead");
    }
  }

  if (deps.telegramMode() !== "off") {
    const toAlert = await deps.getToAlert({ maxAttempts: MAX_DELIVERY_ATTEMPTS, limit: RUN_LIMIT });
    for (const lead of toAlert) {
      try {
        await deps.sendAlert(buildPlektanAlertText(lead));
        await deps.markAlerted(lead.id, deps.now());
        counts.alerts += 1;
      } catch {
        // Not marked, so the next run sends the alert again.
        console.error("[leads-retry] alert failed for one lead");
      }
    }
  }
  return counts;
};

export const retryLeads = (): Promise<RetryCounts> => retryLeadsWith(defaultDeps);
