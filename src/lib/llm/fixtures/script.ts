import { z } from "zod";

import { ASSISTANT_FAQ, ASSISTANT_PERSONA } from "@/constants/assistant";
import type { LlmMessage } from "../types";

type Currency = "UAH" | "USD" | "EUR";

/** Arguments the scripted assistant passes to `search_properties` (same names as the real tool). */
export type FixtureSearchArgs = {
  deal?: "buy" | "rent";
  property_type?: "flat" | "house";
  rooms?: string[];
  budget_from?: number;
  budget_to?: number;
  currency?: Currency;
};

/**
 * What the scripted assistant does this turn: say something, or call a tool. Slice 3 adds another
 * tool step (`propose_lead`); the text steps stay as they are.
 */
export type FixtureStep =
  | { kind: "text"; text: string }
  | { kind: "tool_call"; name: "search_properties"; arguments: FixtureSearchArgs };

type Wishes = {
  deal: "buy" | "rent" | null;
  propertyType: "flat" | "house" | "room" | null;
  rooms: number | null;
  budgetFrom: number | null;
  budgetTo: number | null;
  currency: Currency | null;
};

const ROOM_WORDS: readonly (readonly [string, number])[] = [
  ["одно", 1],
  ["дво", 2],
  ["три", 3],
  ["чотири", 4],
];

const roomsFrom = (text: string): number | null => {
  const digits = /(\d)\s*-?\s*(?:к\b|кімн|кімнат)/.exec(text);
  if (digits?.[1]) return Number(digits[1]);
  const word = ROOM_WORDS.find(([stem]) => text.includes(`${stem}кімнат`) || text.includes(`${stem}к `));
  return word ? word[1] : null;
};

// «80 000 $», «3 млн грн», «1500 євро». A bare number is not a budget: it needs a currency or млн/тис.
const AMOUNT = String.raw`(\d{1,3}(?:[\s ]\d{3})+|\d+(?:[.,]\d+)?)\s*(млн|мільйон\p{L}*|тис\.?|тисяч\p{L}*)?\s*(\$|usd|дол\p{L}*|€|eur|євро|грн|uah|₴|гривн\p{L}*)?`;

const currencyOf = (word: string | undefined): Currency | null => {
  if (!word) return null;
  if (/^(\$|usd|дол)/.test(word)) return "USD";
  if (/^(€|eur|євро)/.test(word)) return "EUR";
  return "UAH";
};

type Amount = { value: number; currency: Currency | null };

const readAmount = (text: string, keyword: "до" | "від"): Amount | null => {
  const match = new RegExp(String.raw`(?:^|[^\p{L}])${keyword}\s+${AMOUNT}`, "u").exec(text);
  if (!match?.[1]) return null;
  const unit = match[2];
  const currency = currencyOf(match[3]);
  if (!unit && !currency) return null;
  const base = Number(match[1].replace(/[\s ]/g, "").replace(",", "."));
  if (!Number.isFinite(base)) return null;
  const factor = unit?.startsWith("м") ? 1_000_000 : unit ? 1_000 : 1;
  return { value: Math.round(base * factor), currency };
};

/** Picks deal / type / rooms / budget out of everything the visitor has said so far (later messages win). */
export const readWishes = (visitorTexts: readonly string[]): Wishes => {
  const wishes: Wishes = {
    deal: null,
    propertyType: null,
    rooms: null,
    budgetFrom: null,
    budgetTo: null,
    currency: null,
  };
  for (const raw of visitorTexts) {
    const text = raw.toLowerCase();
    if (/оренд|зняти|винайм|орендув/.test(text)) wishes.deal = "rent";
    else if (/купи|купів|придба/.test(text)) wishes.deal = "buy";
    if (/будин|котедж/.test(text)) wishes.propertyType = "house";
    else if (/кімнат[уаи]?\s*(?:в|у)\s|окрем\w+ кімнат/.test(text)) wishes.propertyType = "room";
    else if (/квартир|студі|апартамент/.test(text)) wishes.propertyType = "flat";
    wishes.rooms = roomsFrom(text) ?? wishes.rooms;

    const from = readAmount(text, "від");
    const to = readAmount(text, "до");
    if (from || to) {
      wishes.budgetFrom = from ? from.value : null;
      wishes.budgetTo = to ? to.value : null;
      wishes.currency = to?.currency ?? from?.currency ?? "USD";
    }
  }
  return wishes;
};

const findFaq = (text: string) =>
  ASSISTANT_FAQ.find((entry) => entry.keywords.some((keyword) => text.includes(keyword)));

const searchArgsOf = (wishes: Wishes): FixtureSearchArgs => ({
  ...(wishes.deal ? { deal: wishes.deal } : {}),
  // The catalog has no «room» type: a room is searched among flats.
  ...(wishes.propertyType ? { property_type: wishes.propertyType === "house" ? "house" : "flat" } : {}),
  ...(wishes.rooms !== null ? { rooms: [wishes.rooms >= 5 ? "5+" : String(wishes.rooms)] } : {}),
  ...(wishes.budgetFrom !== null ? { budget_from: wishes.budgetFrom } : {}),
  ...(wishes.budgetTo !== null ? { budget_to: wishes.budgetTo } : {}),
  ...(wishes.currency && (wishes.budgetFrom !== null || wishes.budgetTo !== null)
    ? { currency: wishes.currency }
    : {}),
});

/** The part of the tool result the fixture reads (the real model reads all of it). */
const toolResultSchema = z.object({
  total: z.number().int().nonnegative(),
  items: z.array(z.object({ title: z.string(), price: z.string() })),
});

/** The sentence after a search: what was found, then the next useful question. */
const resultsText = (content: string): string => {
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    json = null;
  }
  const parsed = toolResultSchema.safeParse(json);
  if (!parsed.success) return "Не вдалося виконати пошук зараз. Спробуйте, будь ласка, трохи пізніше.";
  const { total, items } = parsed.data;
  const first = items[0];
  if (!first) {
    return "Таких об'єктів зараз немає. Можу залишити запит для менеджера, щойно з'явиться щось схоже, або спробуймо змінити умови.";
  }
  return `Знайшла для вас варіанти, усього ${total}. Для початку: ${first.title}, ${first.price}. Уточнимо район чи бюджет?`;
};

/** Rule-based reply from the conversation (the fixture never sees the system prompt). */
export const planFixtureReply = (messages: readonly LlmMessage[]): FixtureStep => {
  const lastMessage = messages.at(-1);
  // The round after a tool call: the tool result is the last message, as it would be for the real model.
  if (lastMessage?.role === "tool") return { kind: "text", text: resultsText(lastMessage.content) };

  const visitorTexts = messages.flatMap((m) => (m.role === "user" ? [m.content] : []));
  const last = (visitorTexts.at(-1) ?? "").toLowerCase();

  if (/питання про агенц|про агенц/.test(last)) {
    return {
      kind: "text",
      text: "Із задоволенням розповім про агенцію. Запитайте, наприклад, про комісію, перегляд, перевірку документів, іпотеку або години роботи.",
    };
  }

  const faq = findFaq(last);
  if (faq) return { kind: "text", text: faq.answer };

  const wishes = readWishes(visitorTexts);
  if (wishes.deal || wishes.propertyType) {
    return { kind: "tool_call", name: "search_properties", arguments: searchArgsOf(wishes) };
  }

  const intro = visitorTexts.length <= 1 ? `Вітаю! Я ${ASSISTANT_PERSONA.name}. ` : "";
  return { kind: "text", text: `${intro}Ви хочете купити чи орендувати житло?` };
};
