import { ASSISTANT_FAQ, ASSISTANT_PERSONA } from "@/constants/assistant";
import type { LlmMessage } from "../types";

/**
 * What the scripted assistant does this turn. Slice 2 adds a `tool_call` step (`search_properties`),
 * slice 3 another one (`propose_lead`); the text steps stay as they are.
 */
export type FixtureStep = { kind: "text"; text: string };

type Wishes = {
  deal: "buy" | "rent" | null;
  propertyType: "flat" | "house" | "room" | null;
  rooms: number | null;
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

/** Picks deal / type / rooms out of everything the visitor has said so far (later messages win). */
export const readWishes = (visitorTexts: readonly string[]): Wishes => {
  const wishes: Wishes = { deal: null, propertyType: null, rooms: null };
  for (const raw of visitorTexts) {
    const text = raw.toLowerCase();
    if (/оренд|зняти|винайм|орендув/.test(text)) wishes.deal = "rent";
    else if (/купи|купів|придба/.test(text)) wishes.deal = "buy";
    if (/будин|котедж/.test(text)) wishes.propertyType = "house";
    else if (/кімнат[уаи]?\s*(?:в|у)\s|окрем\w+ кімнат/.test(text)) wishes.propertyType = "room";
    else if (/квартир|студі|апартамент/.test(text)) wishes.propertyType = "flat";
    wishes.rooms = roomsFrom(text) ?? wishes.rooms;
  }
  return wishes;
};

const findFaq = (text: string) =>
  ASSISTANT_FAQ.find((entry) => entry.keywords.some((keyword) => text.includes(keyword)));

const DEAL_WORD = { buy: "купівлі", rent: "оренди" } as const;
const TYPE_WORD = { flat: "квартири", house: "будинку", room: "кімнати" } as const;

const nextQuestion = (wishes: Wishes): string => {
  if (!wishes.deal) return "Ви хочете купити чи орендувати житло?";
  if (!wishes.propertyType) return "Що саме шукаєте: квартиру чи будинок?";
  if (wishes.propertyType === "flat" && wishes.rooms === null) return "Скільки кімнат потрібно?";
  return "У якому районі шукаєте і який бюджет розглядаєте?";
};

const describe = (wishes: Wishes): string => {
  const parts: string[] = [];
  if (wishes.deal) parts.push(`для ${DEAL_WORD[wishes.deal]}`);
  if (wishes.propertyType) parts.push(TYPE_WORD[wishes.propertyType]);
  if (wishes.rooms !== null) parts.push(`${wishes.rooms}-кімнатної`);
  return parts.join(", ");
};

/** Rule-based reply from the visitor's messages only (the fixture never sees the system prompt). */
export const planFixtureReply = (messages: readonly LlmMessage[]): FixtureStep => {
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
  const known = describe(wishes);
  const intro = visitorTexts.length <= 1 && !known ? `Вітаю! Я ${ASSISTANT_PERSONA.name}. ` : "";
  const ack = known ? `Зрозуміла, запит ${known}. ` : "";
  return { kind: "text", text: `${intro}${ack}${nextQuestion(wishes)}` };
};
