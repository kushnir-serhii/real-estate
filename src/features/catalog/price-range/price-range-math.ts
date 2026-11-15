import { formatPrice } from "@/lib/format/format-price";
import type { PriceHistogram, PriceHistogramBin } from "@/lib/db/property-histogram-values";
import type { CURRENCIES } from "@/lib/db/property-values";
import type { ExchangeRates } from "@/lib/db/settings";

/**
 * Pure helpers of the price-range filter (spec 021, slice 7). Light on purpose: no zod, no server code.
 *
 * Model: the histogram has N bins, bin i starts at `edges[i]` (the last bin is open-ended). Slider positions
 * are 0..N: the lower thumb sits at a bin start (0..N-1), the upper one at a bin end (1..N-1) or at N, which
 * means «Без максимуму». Prices are USD in the histogram and in the chosen currency in the fields.
 */

export type Currency = (typeof CURRENCIES)[number];

/** What the form submits: bounds in `currency`; `undefined` = no bound. */
export type PriceValue = { from?: number; to?: number; currency: Currency };

/** Slider thumbs as bin positions; `hi === bins.length` means no upper bound. */
export type Positions = { lo: number; hi: number };

export type RangeCount = { count: number; approx: boolean };

const rateOf = (currency: Currency, rates: ExchangeRates): number => (currency === "USD" ? 1 : rates[currency]);

export const usdToCurrency = (usd: number, currency: Currency, rates: ExchangeRates): number =>
  usd * rateOf(currency, rates);

export const currencyToUsd = (value: number, currency: Currency, rates: ExchangeRates): number =>
  value / rateOf(currency, rates);

/** Rounding unit for display values: ~2% of a bin step, as a power of ten (error stays under 1% of a bar). */
const granuleFor = (stepInCurrency: number): number =>
  10 ** Math.floor(Math.log10(Math.max(stepInCurrency / 50, 1)));

/** USD amount → whole number in `currency`, rounded to a sensible unit for this histogram. */
export const niceAmount = (usd: number, currency: Currency, rates: ExchangeRates, stepUsd: number): number => {
  const granule = granuleFor(usdToCurrency(stepUsd, currency, rates));
  return Math.round(usdToCurrency(usd, currency, rates) / granule) * granule;
};

/** Field value in one currency → another (the visitor switched the currency). Without a step: whole numbers. */
export const convertAmount = (
  value: number,
  from: Currency,
  to: Currency,
  rates: ExchangeRates,
  stepUsd: number,
): number => (from === to ? value : niceAmount(currencyToUsd(value, from, rates), to, rates, stepUsd));

export const edgesOf = (bins: readonly PriceHistogramBin[]): number[] => bins.map((b) => b.from_usd);

/** Rounding slack in USD: bounds that differ by less than this are the same bin edge. */
const toleranceOf = (stepUsd: number): number => Math.max(1, stepUsd * 0.01);

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/**
 * Field values (USD) → thumb positions: the lower thumb goes to the start of the bin holding `usdFrom`,
 * the upper one to the first edge at or above `usdTo`.
 */
export const positionsFor = (
  histogram: Pick<PriceHistogram, "bins" | "step_usd">,
  usdFrom: number | undefined,
  usdTo: number | undefined,
): Positions => {
  const n = histogram.bins.length;
  const edges = edgesOf(histogram.bins);
  const tol = toleranceOf(histogram.step_usd);

  let lo = 0;
  if (usdFrom !== undefined) {
    for (let i = 0; i < n; i++) if (edges[i] <= usdFrom + tol) lo = i;
  }
  let hi = n;
  if (usdTo !== undefined) {
    hi = n;
    for (let p = n - 1; p >= 1; p--) if (edges[p] >= usdTo - tol) hi = p;
  }
  lo = clamp(lo, 0, Math.max(n - 1, 0));
  hi = clamp(Math.max(hi, lo + 1), 0, n);
  return { lo, hi };
};

/** Bound a thumb stands for, in the chosen currency; `undefined` = no bound (far left / far right). */
export const valueAtPosition = (
  histogram: Pick<PriceHistogram, "bins" | "step_usd">,
  position: number,
  side: "lower" | "upper",
  currency: Currency,
  rates: ExchangeRates,
): number | undefined => {
  const n = histogram.bins.length;
  if (side === "lower" ? position <= 0 : position >= n) return undefined;
  return niceAmount(histogram.bins[position].from_usd, currency, rates, histogram.step_usd);
};

/**
 * Objects for a USD range. Bars that fit the range count fully; bars the range only cuts into count too
 * (a histogram cannot split a bar), then `approx` is true and the UI shows «≈ N».
 */
export const countInRange = (
  histogram: Pick<PriceHistogram, "bins" | "total" | "step_usd">,
  usdFrom: number | undefined,
  usdTo: number | undefined,
): RangeCount => {
  if (usdFrom === undefined && usdTo === undefined) return { count: histogram.total, approx: false };

  let lo = usdFrom ?? -Infinity;
  let hi = usdTo ?? Infinity;
  if (lo > hi) [lo, hi] = [hi, lo];
  const tol = toleranceOf(histogram.step_usd);

  if (hi - lo <= tol) {
    // A single price: the bar that holds it, never exact.
    const bin = histogram.bins.find((b) => lo >= b.from_usd && (b.to_usd === null || lo < b.to_usd));
    return { count: bin?.count ?? 0, approx: true };
  }

  let count = 0;
  let approx = false;
  for (const bin of histogram.bins) {
    const end = bin.to_usd ?? Infinity;
    const overlap = Math.min(hi, end) - Math.max(lo, bin.from_usd);
    if (overlap <= tol) continue;
    count += bin.count;
    if (overlap < end - bin.from_usd - tol) approx = true;
  }
  return { count, approx };
};

/** Spoken value of a thumb («80 000 USD», «Без максимуму»). */
export const thumbValueText = (value: number | undefined, side: "lower" | "upper", currency: Currency): string =>
  value === undefined ? (side === "lower" ? "Без мінімуму" : "Без максимуму") : formatPrice(value, currency);
