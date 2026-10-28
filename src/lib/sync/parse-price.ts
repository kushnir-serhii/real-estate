import type { Database } from "@/lib/supabase/database.types";
import { decodeHtmlEntities } from "./html-text";

type Currency = Database["public"]["Enums"]["currency"];

export type ParsedPrice = {
  amount: number;
  currency: Currency;
  /** The text states a price per m² ("450 €/м²"), not a total. */
  perM2: boolean;
};

const CURRENCY_PATTERNS: readonly { currency: Currency; pattern: RegExp }[] = [
  { currency: "USD", pattern: /\$|usd|дол/i },
  { currency: "EUR", pattern: /€|eur|євро|евро/i },
  { currency: "UAH", pattern: /₴|uah|грн|гривн/i },
];

const PER_M2_PATTERN = /\/\s*(?:м|m)\s*(?:²|2|кв)|за\s*(?:м|m)\s*(?:²|2|кв)|\d\s*(?:м|m)²/i;

/** "85 000" -> 85000, "1 250,50" -> 1250.5, "1,200" -> 1200, "1.200.000" -> 1200000. */
const parseNumberToken = (token: string): number | null => {
  const compact = token.replace(/\s/g, "").replace(/[.,]+$/, "");
  const separators = compact.match(/[.,]/g) ?? [];
  let normalized = compact;
  if (separators.length > 0) {
    const lastIndex = Math.max(compact.lastIndexOf("."), compact.lastIndexOf(","));
    const decimals = compact.length - lastIndex - 1;
    const mixed = compact.includes(".") && compact.includes(",");
    const isDecimal = decimals >= 1 && decimals <= 2 && (mixed || separators.length === 1);
    normalized = isDecimal
      ? `${compact.slice(0, lastIndex).replace(/[.,]/g, "")}.${compact.slice(lastIndex + 1)}`
      : compact.replace(/[.,]/g, "");
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
};

/**
 * Plektan sends prices as text with HTML entities: "&asymp; 85 000 $", "18 000 грн/міс",
 * "450 €/м²", "Договірна". No number or no recognizable currency -> null (no price).
 */
export const parsePrice = (text: string | null | undefined): ParsedPrice | null => {
  if (text === null || text === undefined) return null;
  const decoded = decodeHtmlEntities(text).replace(/[  ]/g, " ").trim();
  if (decoded === "") return null;

  const numberMatch = /\d[\d\s.,]*/.exec(decoded);
  if (numberMatch === null) return null;
  const amount = parseNumberToken(numberMatch[0]);
  if (amount === null || amount <= 0) return null;

  // The earliest currency mention wins: "3 500 000 грн ($85 000)" is UAH.
  const currency = CURRENCY_PATTERNS.map(({ currency, pattern }) => ({ currency, index: decoded.search(pattern) }))
    .filter(({ index }) => index >= 0)
    .sort((a, b) => a.index - b.index)[0]?.currency;
  if (currency === undefined) return null;

  return { amount: Math.round(amount), currency, perM2: PER_M2_PATTERN.test(decoded) };
};
