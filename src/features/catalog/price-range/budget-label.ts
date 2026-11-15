import { formatNumber, formatPrice } from "@/lib/format/format-price";
import type { CURRENCIES } from "@/lib/db/property-values";

type Currency = (typeof CURRENCIES)[number];

/** Trigger text of the home search: «Будь-який», «до 120 000 USD», «від 80 000 USD», «80 000 – 120 000 USD». */
export const budgetLabel = (from: number | undefined, to: number | undefined, currency: Currency): string => {
  if (from === undefined && to === undefined) return "Будь-який";
  if (from === undefined) return `до ${formatPrice(to ?? 0, currency)}`;
  if (to === undefined) return `від ${formatPrice(from, currency)}`;
  return `${formatNumber(from)} – ${formatPrice(to, currency)}`;
};
