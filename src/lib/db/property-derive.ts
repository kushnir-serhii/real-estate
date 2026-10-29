import type { Currency } from "./property-values";
import type { ExchangeRates } from "./settings";
import { createSlug } from "@/lib/sync/slugify";

/** Pure rules for admin writes (no I/O): the price columns derived from the form, and the slug rule. */

export type DerivedPrice = {
  price_amount: number | null;
  currency: Currency | null;
  price_usd: number | null;
  price_per_m2: number | null;
};

export type PriceInput = {
  price_amount: number | null;
  currency: Currency | null;
  area_total: number | null;
};

const NO_PRICE: DerivedPrice = { price_amount: null, currency: null, price_usd: null, price_per_m2: null };

/**
 * `price_usd` = amount / rate (same rounding as the Plektan mapper); `price_per_m2` = amount / total area,
 * rounded, when both are set. No price (or no currency) clears every price column.
 */
export const derivePrice = (input: PriceInput, rates: ExchangeRates): DerivedPrice => {
  if (input.price_amount === null || input.currency === null) return NO_PRICE;
  const amount = input.price_amount;
  const rate = input.currency === "UAH" ? rates.UAH : input.currency === "EUR" ? rates.EUR : 1;
  const area = input.area_total !== null && input.area_total > 0 ? input.area_total : null;
  return {
    price_amount: amount,
    currency: input.currency,
    price_usd: Math.round(amount / rate),
    price_per_m2: area === null ? null : Math.round(amount / area),
  };
};

export type SlugState = { title: string; published_at: string | null };

/**
 * The slug follows the title until the first publish and never changes afterwards (it is in Google's index).
 * Returns the new slug, or null to keep the current one.
 */
export const nextSlug = (current: SlugState, newTitle: string, suffix?: string): string | null => {
  if (current.published_at !== null) return null;
  if (current.title === newTitle) return null;
  return createSlug(newTitle, suffix);
};

export type AddressState = {
  locality: string | null;
  district: string | null;
  street: string | null;
  house: string | null;
  lat: number | null;
  lng: number | null;
};

const norm = (value: string | null): string => (value ?? "").trim().toLowerCase();

export const sameAddress = (a: AddressState, b: AddressState): boolean =>
  norm(a.locality) === norm(b.locality) &&
  norm(a.district) === norm(b.district) &&
  norm(a.street) === norm(b.street) &&
  norm(a.house) === norm(b.house);

export type GeocodePlan =
  /** Keep the stored coordinates. */
  | { kind: "skip" }
  /** The address moved and has no locality: clear the old coordinates. */
  | { kind: "clear" }
  | { kind: "lookup" };

/** Geocode when the address changed or the coordinates are empty (and there is a locality to look up). */
export const planGeocode = (next: AddressState, stored: AddressState | null): GeocodePlan => {
  const changed = stored === null || !sameAddress(next, stored);
  const missing = stored === null || stored.lat === null || stored.lng === null;
  if (!changed && !missing) return { kind: "skip" };
  if (norm(next.locality) === "") {
    return changed && stored !== null && (stored.lat !== null || stored.lng !== null) ? { kind: "clear" } : { kind: "skip" };
  }
  return { kind: "lookup" };
};
