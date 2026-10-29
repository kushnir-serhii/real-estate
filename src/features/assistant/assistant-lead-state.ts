/** Result of `submitAssistantLead`, safe to import from client components. */

export const ASSISTANT_LEAD_FIELDS = ["name", "phone", "email", "consent"] as const;
export type AssistantLeadField = (typeof ASSISTANT_LEAD_FIELDS)[number];

export type AssistantLeadState =
  | { status: "ok" }
  /** Show each message next to its field and keep the input. Nothing was saved. */
  | { status: "invalid"; fieldErrors: Partial<Record<AssistantLeadField, string>> }
  /** Nothing was saved: show `message` (the card may be stale, or saving failed) and offer a retry. */
  | { status: "error"; message: string };

export const ASSISTANT_LEAD_MESSAGES = {
  stale: "Картка застаріла, попросіть асистента ще раз",
  save: "Не вдалося надіслати заявку. Спробуйте ще раз.",
} as const;
