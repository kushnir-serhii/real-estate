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
};

const defaultDeps: DeliverLeadDeps = {
  loadLead: getLeadForDelivery,
  saveDelivery: updateLeadDelivery,
  plektanMode: resolvePlektanLeadsMode,
  sendToPlektan: addAdvert,
  telegramMode: getTelegramMode,
  sendToTelegram: (text) => sendTelegramMessage({ text }),
  siteUrl: () => process.env.NEXT_PUBLIC_SITE_URL,
};

const isDue = (status: LeadForDelivery["plektan_status"]): boolean => status === "pending" || status === "failed";

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

const runPlektan = async (lead: LeadForDelivery, deps: DeliverLeadDeps): Promise<ChannelRun> => {
  if (!isDue(lead.plektan_status)) return { outcome: "not_due", update: null };
  if (deps.plektanMode() === "off") {
    return {
      outcome: "skipped",
      update: { channel: "plektan", status: "skipped", error: null, attempts: lead.plektan_attempts },
    };
  }
  const attempts = lead.plektan_attempts + 1;
  try {
    const { itemId } = await deps.sendToPlektan(buildPlektanRequest(lead, deps.siteUrl()));
    return { outcome: "sent", update: { channel: "plektan", status: "sent", error: null, attempts, itemId } };
  } catch (error) {
    return {
      outcome: "failed",
      update: { channel: "plektan", status: "failed", error: describeError(error), attempts },
    };
  }
};

const runTelegram = async (lead: LeadForDelivery, deps: DeliverLeadDeps): Promise<ChannelRun> => {
  if (!isDue(lead.telegram_status)) return { outcome: "not_due", update: null };
  if (deps.telegramMode() === "off") {
    return {
      outcome: "skipped",
      update: { channel: "telegram", status: "skipped", error: null, attempts: lead.telegram_attempts },
    };
  }
  const attempts = lead.telegram_attempts + 1;
  try {
    await deps.sendToTelegram(buildTelegramText(lead, deps.siteUrl()));
    return { outcome: "sent", update: { channel: "telegram", status: "sent", error: null, attempts } };
  } catch (error) {
    return {
      outcome: "failed",
      update: { channel: "telegram", status: "failed", error: describeError(error), attempts },
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
  const saves = await Promise.allSettled(
    [plektan, telegram].flatMap((run) => (run.update ? [deps.saveDelivery(id, run.update)] : [])),
  );
  const failedSave = saves.find((save) => save.status === "rejected");
  if (failedSave) throw failedSave.reason;
  return { found: true, plektan: plektan.outcome, telegram: telegram.outcome };
};

/**
 * Sends a saved lead to Plektan and Telegram for every channel that is `pending` or `failed`, and
 * writes status / error / attempts / `plektan_item_id` back. Safe to call again (cron retry, manual
 * retry in the admin): sent and skipped channels are left alone. Empty keys = `skipped`, unless a
 * fixture flag (`PLEKTAN_LEADS_FIXTURE`, `TELEGRAM_FIXTURE`) is set.
 */
export const deliverLead = (id: string): Promise<DeliveryResult> => deliverLeadWith(defaultDeps, id);
