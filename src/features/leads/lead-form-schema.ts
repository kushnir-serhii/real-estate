import { z } from "zod";

import { PROPERTY_TYPES } from "@/lib/db/property-values";
import { normalizePhone } from "./phone";

/** Client-safe: limits, messages and the zod schema are shared by the forms and the server action. */

export const LEAD_LIMITS = { name: 200, email: 254, message: 2000 } as const;

export const LEAD_MESSAGES = {
  name: "Вкажіть ім'я",
  nameTooLong: `Ім'я не може бути довшим за ${LEAD_LIMITS.name} символів`,
  phone: "Перевірте номер телефону",
  email: "Перевірте email",
  message: `Повідомлення не може бути довшим за ${LEAD_LIMITS.message} символів`,
  consent: "Потрібна ваша згода",
  property: "Не вдалося визначити об'єкт. Оновіть сторінку",
  deal: "Оберіть, що вас цікавить",
  propertyType: "Оберіть тип нерухомості",
  generic: "Перевірте це поле",
} as const;

export const LEAD_DEALS = ["buy", "rent"] as const;
export type LeadDeal = (typeof LEAD_DEALS)[number];
export { PROPERTY_TYPES as LEAD_PROPERTY_TYPES };

export const LEAD_ERROR_MESSAGES = {
  save: "Не вдалося надіслати заявку. Спробуйте ще раз.",
  turnstile: "Не вдалося підтвердити, що ви не робот. Спробуйте ще раз.",
  property: "Цей об'єкт більше недоступний. Оновіть сторінку.",
} as const;

/** Honeypot: hidden input that real visitors never fill. */
export const HONEYPOT_FIELD = "website";
export const TURNSTILE_FIELD = "cf-turnstile-response";

const required = (message: string) => z.string({ error: message }).trim().min(1, { error: message });

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), schema.optional());

const common = {
  client_request_id: z.uuid({ error: LEAD_MESSAGES.generic }),
  name: required(LEAD_MESSAGES.name).max(LEAD_LIMITS.name, { error: LEAD_MESSAGES.nameTooLong }),
  phone: required(LEAD_MESSAGES.phone)
    .refine((v) => normalizePhone(v) !== null, { error: LEAD_MESSAGES.phone })
    .transform((v) => normalizePhone(v) ?? v),
  email: optional(z.email({ error: LEAD_MESSAGES.email }).max(LEAD_LIMITS.email, { error: LEAD_MESSAGES.email })),
  message: optional(z.string().trim().max(LEAD_LIMITS.message, { error: LEAD_MESSAGES.message })),
  // Checkbox: HTML sends "on"; programmatic callers may send true.
  consent: z.preprocess(
    (v) => v === "on" || v === "true" || v === true,
    z.literal(true, { error: LEAD_MESSAGES.consent }),
  ),
};

export const propertyRequestSchema = z.object({
  kind: z.literal("property_request"),
  ...common,
  property_id: z.uuid({ error: LEAD_MESSAGES.property }),
});

export const generalRequestSchema = z.object({
  kind: z.literal("general"),
  ...common,
  deal: z.enum(LEAD_DEALS, { error: LEAD_MESSAGES.deal }),
  property_type: optional(z.enum(PROPERTY_TYPES, { error: LEAD_MESSAGES.propertyType })),
  /** Id of the sold/hidden property the visitor looked at; the server resolves slug and title. */
  similar_to: optional(z.uuid({ error: LEAD_MESSAGES.generic })),
});

export const leadFormSchema = z.discriminatedUnion("kind", [propertyRequestSchema, generalRequestSchema], {
  error: LEAD_MESSAGES.generic,
});

export type LeadFormData = z.output<typeof leadFormSchema>;

const UTM_MAX_KEYS = 10;
const UTM_MAX_LENGTH = 200;

/**
 * `utm` form field: a JSON object string such as `{"utm_source":"google"}`. Keeps only `utm_*`
 * string values (bounded); anything else, or bad JSON, gives undefined: tracking never blocks a lead.
 */
export const parseUtm = (value: unknown): Record<string, string> | undefined => {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return undefined;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return undefined;
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(parsed)) {
    if (Object.keys(result).length >= UTM_MAX_KEYS) break;
    if (/^utm_[a-z_]{1,32}$/.test(key) && typeof val === "string" && val !== "") {
      result[key] = val.slice(0, UTM_MAX_LENGTH);
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
};
