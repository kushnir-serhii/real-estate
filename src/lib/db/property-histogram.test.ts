import { describe, expect, it } from "vitest";
import { buildPriceHistogram, niceStep } from "./property-histogram";

const sum = (counts: { count: number }[]) => counts.reduce((a, b) => a + b.count, 0);

describe("niceStep", () => {
  it("rounds up to a round whole-dollar step", () => {
    expect(niceStep(0.3)).toBe(1);
    expect(niceStep(1100)).toBe(1200);
    expect(niceStep(7200)).toBe(8000);
    expect(niceStep(110_000)).toBe(120_000);
    expect(niceStep(2.2)).toBe(3);
  });
});

describe("buildPriceHistogram", () => {
  it("no prices: no bins, null stats", () => {
    expect(buildPriceHistogram([])).toEqual({
      bins: [],
      total: 0,
      min_usd: null,
      median_usd: null,
      max_usd: null,
      step_usd: 0,
    });
  });

  it("one price: a single open-ended bin", () => {
    expect(buildPriceHistogram([90_000])).toEqual({
      bins: [{ from_usd: 90_000, to_usd: null, count: 1 }],
      total: 1,
      min_usd: 90_000,
      median_usd: 90_000,
      max_usd: 90_000,
      step_usd: 0,
    });
  });

  it("all prices equal: one bin with every row", () => {
    const h = buildPriceHistogram([50_000, 50_000, 50_000]);
    expect(h.bins).toEqual([{ from_usd: 50_000, to_usd: null, count: 3 }]);
    expect(h.total).toBe(3);
  });

  it("skewed prices: nice contiguous bins, the villa lands in the open-ended last bin", () => {
    const prices = [...Array.from({ length: 99 }, (_, i) => 40_000 + i * 2_000), 9_000_000];
    const h = buildPriceHistogram(prices);
    expect(h.total).toBe(100);
    expect(sum(h.bins)).toBe(100);
    expect(h.bins.length).toBeGreaterThanOrEqual(20);
    expect(h.bins.length).toBeLessThanOrEqual(30);
    const last = h.bins[h.bins.length - 1];
    expect(last?.to_usd).toBeNull();
    expect(last?.count).toBeGreaterThanOrEqual(1);
    expect(h.max_usd).toBe(9_000_000);
    expect(h.min_usd).toBe(40_000);
    // Contiguous, equal width, edges are multiples of the step.
    for (let i = 0; i < h.bins.length - 1; i++) {
      const bin = h.bins[i]!;
      expect(bin.to_usd).toBe(h.bins[i + 1]!.from_usd);
      expect(bin.to_usd! - bin.from_usd).toBe(h.step_usd);
      expect(bin.from_usd % h.step_usd).toBe(0);
    }
    // The chart is not flattened: the open-ended bin holds the outlier, not the bulk.
    expect(last!.count).toBeLessThan(10);
  });

  it("the median is the middle price (mean of the two middle ones, rounded)", () => {
    expect(buildPriceHistogram([10, 20, 30]).median_usd).toBe(20);
    expect(buildPriceHistogram([10, 21]).median_usd).toBe(16);
  });

  it("small prices (daily rent) get whole-dollar edges", () => {
    const h = buildPriceHistogram([35, 40, 55, 60, 80, 120, 150, 400]);
    expect(sum(h.bins)).toBe(8);
    for (const bin of h.bins) expect(Number.isInteger(bin.from_usd)).toBe(true);
  });
});
