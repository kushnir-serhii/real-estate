import type { PriceHistogram, PriceHistogramBin } from "./property-histogram-values";

/** Pure binning for the price histogram; the drivers only supply the price list. */

/** Bars aimed at (the open-ended one included); the nice step lands the real count a little below. */
const TARGET_BINS = 28;
/** The open-ended bar starts at ≈ this percentile. */
const CUTOFF_PERCENTILE = 0.95;
const NICE = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

/** Smallest "round" step (1, 1.2, 1.5, 2, 2.5 … × 10^k, whole dollars) that is at least `raw`, never below 1 USD. */
export const niceStep = (raw: number): number => {
  if (raw <= 1) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const mantissa = NICE.find((m) => m * magnitude >= raw - 1e-9) ?? 10;
  // Whole dollars only (`price_usd` is an integer): 1.2 or 2.5 at the smallest magnitude round up.
  return Math.ceil(Math.round(mantissa * magnitude * 1000) / 1000);
};

/** Nearest-rank percentile of an ascending list (`p` in 0..1). */
const percentile = (sorted: readonly number[], p: number): number =>
  sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))] as number;

const median = (sorted: readonly number[]): number => {
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1
    ? (sorted[mid] as number)
    : Math.round(((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2);
};

/**
 * Bins USD prices: linear "nice" bins from `min` rounded down to a multiple of the step (so from 0 when the
 * lowest price is under one step: the chart starts at a round number and the slider's low end reads «0»),
 * regular up to ≈ the 95th percentile, then one open-ended bin for everything above, so a single villa
 * doesn't flatten the chart. Non-finite values and prices ≤ 0 should be filtered out by the caller.
 */
export const buildPriceHistogram = (prices: readonly number[]): PriceHistogram => {
  const sorted = prices.filter((p) => Number.isFinite(p)).sort((a, b) => a - b);
  const total = sorted.length;
  if (total === 0) return { bins: [], total: 0, min_usd: null, median_usd: null, max_usd: null, step_usd: 0 };

  const min = sorted[0] as number;
  const max = sorted[total - 1] as number;
  const stats = { total, min_usd: min, median_usd: median(sorted), max_usd: max };
  if (min === max) return { ...stats, bins: [{ from_usd: min, to_usd: null, count: total }], step_usd: 0 };

  const upper = percentile(sorted, CUTOFF_PERCENTILE);
  const step = niceStep(Math.max(upper - min, 1) / (TARGET_BINS - 1));
  const start = Math.floor(min / step) * step;
  // Regular bins cover [start, start + regular * step), which reaches the cut-off; the last bin is open.
  const regular = Math.max(1, Math.ceil((upper - start) / step));

  const bins: PriceHistogramBin[] = Array.from({ length: regular }, (_, i) => ({
    from_usd: start + i * step,
    to_usd: start + (i + 1) * step,
    count: 0,
  }));
  bins.push({ from_usd: start + regular * step, to_usd: null, count: 0 });

  for (const price of sorted) {
    const index = Math.min(regular, Math.floor((price - start) / step));
    (bins[index] as PriceHistogramBin).count += 1;
  }
  return { ...stats, bins, step_usd: step };
};
