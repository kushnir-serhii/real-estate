import { PROPERTY_TYPES } from "@/lib/db/property-values";

/** Client-safe constants of the lead forms. No zod here: client forms import this file, and zod would ship in the first-load JS of every page with a form. */
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
