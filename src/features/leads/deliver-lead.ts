import "server-only";

import {
  getLeadForDelivery,
  updateLeadDelivery,
  type LeadDeliveryUpdate,
  type LeadForDelivery,
} from "@/lib/db/leads";
import {
  addAdvert,
  isPlektanError,
  resolvePlektanLeadsMode,
  type PlektanAddAdvertParams,
  type PlektanLeadsMode,
} from "@/lib/plektan";
import { getTelegramMode, isTelegramError, sendTelegramMessage, type TelegramMode } from "@/lib/telegram";
import { MAX_DELIVERY_ATTEMPTS, nextAttemptAt } from "./retry-schedule";
import { buildPlektanRequest, buildTelegramText } from "./lead-delivery-content";

/** What happened to one channel in this run. `not_due`: it was already sent or skipped. */
export type ChannelOutcome = "sent" | "failed" | "skipped" | "not_due";
export type DeliveryResult = { found: boolean; plektan: ChannelOutcome; telegram: ChannelOutcome };

export type DeliverLeadDeps = {
  loadLead: (id: string) => Promise<LeadForDelivery | null>;
  saveDelivery: (id: string, update: LeadDeliveryUpdate) => Promise<void>;
  plektanMode: () => PlektanLeadsMode;
  sendToPlektan: (params: PlektanAddAdvertParams) => Promise<{ itemId: string | null }>;
  telegramMode: () => TelegramMode;
  sendToTelegram: (text: string) => Promise<void>;
  siteUrl: () => string | undefined;
  now: () => Date;
};

const defaultDeps: DeliverLeadDeps = {
  loadLead: getLeadForDelivery,
  saveDelivery: updateLeadDelivery,
  plektanMode: resolvePlektanLeadsMode,
  sendToPlektan: addAdvert,
  telegramMode: getTelegramMode,
  sendToTelegram: (text) => sendTelegramMessage({ text }),
  siteUrl: () => process.env.NEXT_PUBLIC_SITE_URL,
  now: () => new Date(),
};

/** Pending, or failed with attempts left (a channel that used all its attempts is final). */
const isDue = (status: LeadForDelivery["plektan_status"], attempts: number): boolean =>
  status === "pending" || (status === "failed" && attempts < MAX_DELIVERY_ATTEMPTS);

const retryAt = (failedAttempts: number, deps: DeliverLeadDeps): string | null =>
  nextAttemptAt(failedAttempts, deps.now())?.toISOString() ?? null;

/** Short, no personal data: the error kind (+ HTTP status). Provider messages can echo the input, so they are dropped. */
const describeError = (error: unknown): string => {
  if (isPlektanError(error) || isTelegramError(error)) {
    const { details } = error;
    return details.kind === "http" ? `http ${details.status}` : details.kind;
  }
  return "unexpected";
};

type ChannelRun = {
  outcome: ChannelOutcome;
  update: LeadDeliveryUpdate | null;
};

/**
 * `force` (manual retry): runs when the channel is `failed`, however many attempts it used; any
 * other status is left alone. Without it only the cron/first-delivery rule (`isDue`) applies.
 */
const shouldRun = (status: LeadForDelivery["plektan_status"], attempts: number, force: boolean): boolean =>
  force ? status === "failed" : isDue(status, attempts);

const runPlektan = async (lead: LeadForDelivery, deps: DeliverLeadDeps, force = false): Promise<ChannelRun> => {
  if (!shouldRun(lead.plektan_status, lead.plektan_attempts, force)) return { outcome: "not_due", update: null };
  if (deps.plektanMode() === "off") {
    return {
      outcome: "skipped",
      update: { channel: "plektan", status: "skipped", error: null, attempts: lead.plektan_attempts, nextAttemptAt: null },
    };
  }
  const attempts = lead.plektan_attempts + 1;
  try {
    const { itemId } = await deps.sendToPlektan(buildPlektanRequest(lead, deps.siteUrl()));
    return { outcome: "sent", update: { channel: "plektan", status: "sent", error: null, attempts, itemId, nextAttemptAt: null } };
  } catch (error) {
    return {
      outcome: "failed",
      update: { channel: "plektan", status: "failed", error: describeError(error), attempts, nextAttemptAt: retryAt(attempts, deps) },
    };
  }
};

const runTelegram = async (lead: LeadForDelivery, deps: DeliverLeadDeps, force = false): Promise<ChannelRun> => {
  if (!shouldRun(lead.telegram_status, lead.telegram_attempts, force)) return { outcome: "not_due", update: null };
  if (deps.telegramMode() === "off") {
    return {
      outcome: "skipped",
      update: { channel: "telegram", status: "skipped", error: null, attempts: lead.telegram_attempts, nextAttemptAt: null },
    };
  }
  const attempts = lead.telegram_attempts + 1;
  try {
    await deps.sendToTelegram(buildTelegramText(lead, deps.siteUrl()));
    return { outcome: "sent", update: { channel: "telegram", status: "sent", error: null, attempts, nextAttemptAt: null } };
  } catch (error) {
    return {
      outcome: "failed",
      update: { channel: "telegram", status: "failed", error: describeError(error), attempts, nextAttemptAt: retryAt(attempts, deps) },
    };
  }
};

/**
 * Delivery with injectable dependencies (tests). The channels run independently: a failure of one
 * is recorded on the lead and never stops the other. Throws only if the database itself fails.
 */
export const deliverLeadWith = async (deps: DeliverLeadDeps, id: string): Promise<DeliveryResult> => {
  const lead = await deps.loadLead(id);
  if (!lead) return { found: false, plektan: "not_due", telegram: "not_due" };

  const [plektan, telegram] = await Promise.all([runPlektan(lead, deps), runTelegram(lead, deps)]);
  await saveRuns(deps, id, [plektan, telegram]);
  return { found: true, plektan: plektan.outcome, telegram: telegram.outcome };
};

const saveRuns = async (deps: DeliverLeadDeps, id: string, runs: ChannelRun[]): Promise<void> => {
  const saves = await Promise.allSettled(
    runs.flatMap((run) => (run.update ? [deps.saveDelivery(id, run.update)] : [])),
  );
  const failedSave = saves.find((save) => save.status === "rejected");
  if (failedSave) throw failedSave.reason;
};

/**
 * Manual retry from the admin: ONE attempt of ONE channel, now, only when that channel is `failed`
 * (also past `MAX_DELIVERY_ATTEMPTS`). On failure the backoff is set only while attempts remain,
 * so it never extends the cron schedule. Throws only if the database itself fails.
 */
export const retryLeadChannelWith = async (
  deps: DeliverLeadDeps,
  id: string,
  channel: "plektan" | "telegram",
): Promise<{ found: boolean; outcome: ChannelOutcome }> => {
  const lead = await deps.loadLead(id);
  if (!lead) return { found: false, outcome: "not_due" };
  const run = channel === "plektan" ? await runPlektan(lead, deps, true) : await runTelegram(lead, deps, true);
  await saveRuns(deps, id, [run]);
  return { found: true, outcome: run.outcome };
};

/**
 * Sends a saved lead to Plektan and Telegram for every channel that is `pending` or `failed`, and
 * writes status / error / attempts / `plektan_item_id` back. Safe to call again (cron retry, manual
 * retry in the admin): sent and skipped channels are left alone. Empty keys = `skipped`, unless a
 * fixture flag (`PLEKTAN_LEADS_FIXTURE`, `TELEGRAM_FIXTURE`) is set.
 */
export const deliverLead = (id: string): Promise<DeliveryResult> => deliverLeadWith(defaultDeps, id);

export const retryLeadChannel = (id: string, channel: "plektan" | "telegram") =>
  retryLeadChannelWith(defaultDeps, id, channel);
