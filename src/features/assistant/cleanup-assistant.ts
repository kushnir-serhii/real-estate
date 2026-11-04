import "server-only";

import { deleteConversationsBefore, deleteUsageBefore } from "@/lib/db/assistant";

/** Transcripts live this long; the structured wishes stay in the lead. */
export const TRANSCRIPT_RETENTION_DAYS = 30;
/** Monthly spend rows are kept this long. */
export const USAGE_RETENTION_MONTHS = 13;

const DAY_MS = 86_400_000;

/**
 * Deletes conversations older than 30 days (their messages cascade; leads stay: only the conversation's
 * `lead_id` link goes with it) and spend rows older than 13 months.
 */
export const cleanupAssistant = async (now: Date = new Date()): Promise<{ deleted: number; usageDeleted: number }> => {
  const deleted = await deleteConversationsBefore(new Date(now.getTime() - TRANSCRIPT_RETENTION_DAYS * DAY_MS).toISOString());
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - USAGE_RETENTION_MONTHS, 1));
  const usageDeleted = await deleteUsageBefore(cutoff.toISOString().slice(0, 10));
  return { deleted, usageDeleted };
};
