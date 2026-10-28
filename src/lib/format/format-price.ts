import type { CURRENCIES, DEALS } from "@/lib/db/property-values";

type Currency = (typeof CURRENCIES)[number];
type Deal = (typeof DEALS)[number];

const SUFFIX: Record<Deal, string> = {
  sell: "",
  rent_long: " / міс",
  rent_day: " / доба",
};

export const PRICE_ON_REQUEST = "Ціна за запитом";

/** Price with currency, `uk-UA`. Null amount → «Ціна за запитом». */
export const formatPrice = (amount: number | null, currency: Currency, deal?: Deal): string => {
  if (amount === null) return PRICE_ON_REQUEST;
  const formatted = new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted}${deal ? SUFFIX[deal] : ""}`;
};
