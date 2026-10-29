import {
  ASSISTANT_FAQ,
  ASSISTANT_PERSONA,
  ASSISTANT_QUICK_REPLIES,
  ASSISTANT_RULES,
} from "@/constants/assistant";
import { BRAND } from "@/constants/brand";
import { CONTACTS } from "@/constants/contacts";
import { DEAL_LABELS, PROPERTY_TYPE_LABELS } from "@/features/properties/property-labels";
import type { PublishedProperty } from "@/lib/db/properties";
import { formatPrice } from "@/lib/format/format-price";

/** What the prompt needs from the property page the visitor is on (published only, resolved on the server). */
export type PromptProperty = Pick<
  PublishedProperty,
  "slug" | "title" | "deal" | "property_type" | "price_amount" | "currency" | "room_count" | "district"
>;

/** Site path of a property page. */
export const propertyPath = (slug: string): string => `/catalog/${slug}`;

const propertyContext = (property: PromptProperty): string => {
  const lines = [
    `Назва: ${property.title}`,
    `Ціна: ${formatPrice(property.price_amount, property.currency ?? "USD", property.deal)}`,
    `Угода: ${DEAL_LABELS[property.deal]}`,
    `Тип: ${PROPERTY_TYPE_LABELS[property.property_type]}`,
    ...(property.room_count !== null ? [`Кімнат: ${property.room_count}`] : []),
    ...(property.district ? [`Район: ${property.district}`] : []),
    `Посилання: ${propertyPath(property.slug)}`,
  ];
  return [
    "Відвідувач зараз дивиться цей об'єкт нашого каталогу. Питання «цей об'єкт», «тут», «ця квартира» стосуються саме його. Використовуй лише ці дані; чого тут немає, того не знаєш.",
    ...lines.map((line) => `- ${line}`),
  ].join("\n");
};

/** Builds the system prompt from the assistant constants and the optional current property. */
export const buildSystemPrompt = (property?: PromptProperty | null): string => {
  const sections = [
    `Ти ${ASSISTANT_PERSONA.name}, ${ASSISTANT_PERSONA.role}. Агенція: ${BRAND.name}. ${BRAND.tagline}`,
    `Контакти агенції: телефон ${CONTACTS.phone.display}, пошта ${CONTACTS.email}, адреса ${CONTACTS.address}, години роботи ${CONTACTS.hours}.`,
    `Правила:\n${ASSISTANT_RULES.map((rule) => `- ${rule}`).join("\n")}`,
    `FAQ агенції (відповідай на питання лише за цим текстом):\n${ASSISTANT_FAQ.map((e) => `Q: ${e.question}\nA: ${e.answer}`).join("\n\n")}`,
    `Початкові кнопки швидкої відповіді в чаті: ${ASSISTANT_QUICK_REPLIES.join(", ")}.`,
    ...(property ? [propertyContext(property)] : []),
  ];
  return sections.join("\n\n");
};
