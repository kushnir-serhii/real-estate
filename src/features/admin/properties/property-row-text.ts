import type { AdminPropertyListItem } from "@/lib/db/admin-properties";
import { formatPrice } from "@/lib/format/format-price";
import { PRICE_NEGOTIABLE } from "./property-list-labels";

type Row = Pick<AdminPropertyListItem, "district" | "locality" | "street" | "price_amount" | "currency" | "deal">;

/** «Шевченківський р-н, Київ, вул. Хрещатик»; null when nothing is filled in (a fresh draft). */
export const propertyAddress = (p: Row): string | null => {
  const parts = [p.district, p.locality, p.street].filter((s): s is string => Boolean(s?.trim()));
  return parts.length ? parts.join(", ") : null;
};

/** Price with currency, or «Ціна за запитом» (no amount, or a currency gap). */
export const propertyPrice = (p: Row): string =>
  p.price_amount !== null && p.currency !== null ? formatPrice(p.price_amount, p.currency, p.deal) : PRICE_NEGOTIABLE;
