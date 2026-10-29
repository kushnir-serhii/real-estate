import { z } from "zod";

/** Shared by the server (stream writer) and the client (stream reader): keep free of server-only imports. */

export const ASSISTANT_MESSAGE_MAX_LENGTH = 1000;

/** `POST /api/assistant` body. The history is never sent: the server loads it by `conversation_id`. */
export const assistantRequestSchema = z.object({
  conversation_id: z.uuid().optional(),
  message: z.string().trim().min(1).max(ASSISTANT_MESSAGE_MAX_LENGTH),
  page_url: z.string().trim().max(2048).optional(),
  property_slug: z.string().trim().min(1).max(200).optional(),
});

export type AssistantRequest = z.infer<typeof assistantRequestSchema>;
/** What the client builds (before trimming/validation). */
export type AssistantRequestInput = z.input<typeof assistantRequestSchema>;

/** Card data for one property in the chat (slice 2 emits these). `url` is a site path. */
export const assistantPropertyCardSchema = z.object({
  slug: z.string(),
  title: z.string(),
  /** Already formatted with `formatPrice` (e.g. «85 000 $»). */
  price: z.string(),
  rooms: z.number().int().nullable(),
  area_total: z.number().nullable(),
  district: z.string().nullable(),
  photo_url: z.string().nullable(),
  url: z.string(),
});

export type AssistantPropertyCard = z.infer<typeof assistantPropertyCardSchema>;

export const ASSISTANT_LIMIT_REASONS = [
  "rate_limit",
  "conversation_limit",
  "message_too_long",
  "budget",
  "turnstile",
] as const;
export type AssistantLimitReason = (typeof ASSISTANT_LIMIT_REASONS)[number];

export const assistantEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("conversation"), id: z.uuid() }),
  z.object({ type: z.literal("text"), delta: z.string() }),
  z.object({
    type: z.literal("properties"),
    items: z.array(assistantPropertyCardSchema),
    total: z.number().int().nonnegative(),
    catalog_url: z.string(),
  }),
  z.object({
    type: z.literal("lead_card"),
    proposal_id: z.string(),
    prefill: z.object({ name: z.string().optional(), phone: z.string().optional() }),
    summary: z.string(),
  }),
  z.object({ type: z.literal("limit"), reason: z.enum(ASSISTANT_LIMIT_REASONS) }),
  z.object({ type: z.literal("error"), message: z.string() }),
  z.object({ type: z.literal("done") }),
]);

export type AssistantEvent = z.infer<typeof assistantEventSchema>;
export type AssistantEventType = AssistantEvent["type"];

/** One NDJSON line (without the newline) to a validated event, or null when it is not a known event. */
export const parseAssistantEventLine = (line: string): AssistantEvent | null => {
  if (line.trim() === "") return null;
  let json: unknown;
  try {
    json = JSON.parse(line);
  } catch {
    return null;
  }
  const parsed = assistantEventSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
};

/** One event as an NDJSON line, newline included. */
export const encodeAssistantEvent = (event: AssistantEvent): string => `${JSON.stringify(event)}\n`;
