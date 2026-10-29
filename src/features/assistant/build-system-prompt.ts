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
    "Якщо відвідувач хоче схожі або інші варіанти, виклич search_properties із відповідними умовами (угода, тип, кімнати, бюджет, район).",
  ].join("\n");
};

/** How and when the model uses the search tool. */
const SEARCH_TOOL_RULES = [
  "Інструмент search_properties шукає серед опублікованих об'єктів нашої агенції. Виклич його, щойно знаєш угоду (купівля чи оренда) або тип; решту умов додавай, коли відвідувач їх назве.",
  "Не називай жодного об'єкта, ціни чи посилання, поки не отримав їх від search_properties. Згадуй лише ті об'єкти, які він повернув; не вигадуй і не доповнюй дані.",
  "Картки знайдених об'єктів і посилання на каталог відвідувач бачить у чаті сам: не вставляй у відповідь URL, яких не повертав інструмент, і не переписуй усі характеристики. Коротко прокоментуй результат і запропонуй уточнити умови.",
  "Бюджет передавай у тій валюті, яку назвав відвідувач (UAH, USD або EUR); без валюти питай або використовуй USD.",
  "Якщо інструмент не знайшов нічого (total = 0), чесно скажи, що таких об'єктів зараз немає, і запропонуй змінити умови або залишити запит для менеджера.",
  "Якщо інструмент повернув помилку або district_ignored, не показуй технічних деталей: скажи, що район не знайдено серед наших, і запропонуй схожі з available_districts.",
] as const;

/** When and how the model offers the request card. */
const LEAD_TOOL_RULES = [
  "Інструмент propose_lead показує відвідувачу картку заявки (ім'я, телефон, згода). Виклич його, коли відвідувач хоче, щоб з ним зв'язалися, залишити заявку чи записатися на перегляд, а також після результатів пошуку, коли він зацікавлений. Передай усе, що вже відомо: угоду, тип, райони, кімнати, бюджет із валютою, оплату (готівка чи іпотека), терміни та короткий опис українською.",
  "Імені й телефону можна запитати в чаті, але не наполягай: у картці відвідувач введе їх сам.",
  "propose_lead нічого не надсилає. Не кажи, що заявку надіслано чи передано менеджеру, доки відвідувач не підтвердить картку: після виклику лише попроси перевірити дані в картці й натиснути «Надіслати».",
  "Не проси згоди на обробку даних у тексті: картка робить це сама.",
] as const;

/** Builds the system prompt from the assistant constants and the optional current property. */
export const buildSystemPrompt = (property?: PromptProperty | null): string => {
  const sections = [
    `Ти ${ASSISTANT_PERSONA.name}, ${ASSISTANT_PERSONA.role}. Агенція: ${BRAND.name}. ${BRAND.tagline}`,
    `Контакти агенції: телефон ${CONTACTS.phone.display}, пошта ${CONTACTS.email}, адреса ${CONTACTS.address}, години роботи ${CONTACTS.hours}.`,
    `Правила:\n${ASSISTANT_RULES.map((rule) => `- ${rule}`).join("\n")}`,
    `Пошук об'єктів:\n${SEARCH_TOOL_RULES.map((rule) => `- ${rule}`).join("\n")}`,
    `Заявка для менеджера:\n${LEAD_TOOL_RULES.map((rule) => `- ${rule}`).join("\n")}`,
    `FAQ агенції (відповідай на питання лише за цим текстом):\n${ASSISTANT_FAQ.map((e) => `Q: ${e.question}\nA: ${e.answer}`).join("\n\n")}`,
    `Початкові кнопки швидкої відповіді в чаті: ${ASSISTANT_QUICK_REPLIES.join(", ")}.`,
    ...(property ? [propertyContext(property)] : []),
  ];
  return sections.join("\n\n");
};
