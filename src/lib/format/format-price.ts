import type { CURRENCIES, DEALS } from "@/lib/db/property-values";

type Currency = (typeof CURRENCIES)[number];
type Deal = (typeof DEALS)[number];

const SUFFIX: Record<Deal, string> = {
  sell: "",
  rent_long: " / міс",
  rent_day: " / доба",
};

/**
 * Currency signs, fixed so server and browser render the same text: `Intl`'s currency display for `uk-UA` differs
 * between runtimes (Node prints «₴», Chrome «грн»), which made client-rendered prices (favorites) differ from the
 * server ones. Values match what the server printed before (USD / EUR as codes).
 */
const CURRENCY_SIGN: Record<Currency, string> = {
  UAH: "₴",
  USD: "USD",
  EUR: "EUR",
};

const NUMBER = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 });

export const PRICE_ON_REQUEST = "Ціна за запитом";

/** Price with currency, `uk-UA` digit grouping. Null amount → «Ціна за запитом». */
export const formatPrice = (amount: number | null, currency: Currency, deal?: Deal): string => {
  if (amount === null) return PRICE_ON_REQUEST;
  // U+00A0 between the number and the sign, like Intl's currency style
  return `${NUMBER.format(amount)} ${CURRENCY_SIGN[currency]}${deal ? SUFFIX[deal] : ""}`;
};
