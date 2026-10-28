/** Result of `submitLead`, safe to import from client components. */

export const LEAD_FIELDS = [
  "kind",
  "client_request_id",
  "name",
  "phone",
  "email",
  "message",
  "consent",
  "property_id",
  "deal",
  "property_type",
  "similar_to",
] as const;
export type LeadField = (typeof LEAD_FIELDS)[number];

export type LeadFormState =
  | { status: "idle" }
  | { status: "ok" }
  /** Show each message next to its field and keep the input. Nothing was saved. */
  | { status: "invalid"; fieldErrors: Partial<Record<LeadField, string>> }
  /** Nothing was saved (or the human check failed): show `message` and offer a retry. */
  | { status: "error"; message: string };

export const initialLeadFormState: LeadFormState = { status: "idle" };
