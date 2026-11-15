import type { ExchangeRates } from "./settings";
import type { DEALS } from "./property-values";

/**
 * Price histogram types and constants (spec 021, slice 6). Light on purpose: no zod, no server code,
 * so the price-range filter (a client component) can import it.
 */

/** One bar. `to_usd` is exclusive; `null` marks the open-ended last bar (everything from `from_usd` up). */
export type PriceHistogramBin = {
  from_usd: number;
  to_usd: number | null;
  count: number;
};

/**
 * Prices in USD (`price_usd`, rounded to whole dollars), only for published rows with a known price.
 * - `bins`: contiguous, ascending, equal width except the open-ended last one; counts add up to `total`.
 *   Empty when `total` is 0. A single distinct price gives one open-ended bin.
 * - `total`: rows counted (rows without a price are not counted).
 * - `min_usd` / `median_usd` / `max_usd`: over all counted rows (the max is not cut at the 95th percentile);
 *   `null` when `total` is 0.
 * - `step_usd`: width of the regular bins (0 when there is one bin only). `bins[0].from_usd` is `min_usd`
 *   rounded down to a multiple of the step, so it is `0` whenever the lowest price is under one step.
 */
export type PriceHistogram = {
  bins: PriceHistogramBin[];
  total: number;
  min_usd: number | null;
  median_usd: number | null;
  max_usd: number | null;
  step_usd: number;
};

type Deal = (typeof DEALS)[number];

/** Without a deal the histogram uses this one: sale, rent and daily prices are never mixed. */
export const HISTOGRAM_DEFAULT_DEAL = "sell" as const satisfies Deal;

/** Body of `GET /api/price-histogram`: USD histogram + rates (units per 1 USD) so the client converts bins and fields itself. */
export type PriceHistogramResponse = {
  deal: Deal;
  histogram: PriceHistogram;
  rates: ExchangeRates;
};
