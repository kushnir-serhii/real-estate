import { describe, expect, it } from "vitest";

import { budgetLabel } from "./budget-label";
import {
  convertAmount,
  countInRange,
  niceAmount,
  positionsFor,
  valueAtPosition,
} from "./price-range-math";

const RATES = { UAH: 40, EUR: 0.9 };

// 5 bins of 20 000 USD, the last one open-ended: 0-20k, 20-40k, 40-60k, 60-80k, 80k+
const HISTOGRAM = {
  bins: [
    { from_usd: 0, to_usd: 20000, count: 4 },
    { from_usd: 20000, to_usd: 40000, count: 10 },
    { from_usd: 40000, to_usd: 60000, count: 6 },
    { from_usd: 60000, to_usd: 80000, count: 3 },
    { from_usd: 80000, to_usd: null, count: 2 },
  ],
  total: 25,
  step_usd: 20000,
};

describe("conversion", () => {
  it("rounds a converted bin edge to a unit that is small next to a bar", () => {
    expect(niceAmount(40000, "USD", RATES, 20000)).toBe(40000);
    expect(niceAmount(40000, "UAH", RATES, 20000)).toBe(1600000);
    expect(niceAmount(41234, "UAH", RATES, 20000)).toBe(1650000);
    expect(niceAmount(40000, "EUR", RATES, 20000)).toBe(36000);
  });

  it("converts a field value when the currency changes", () => {
    expect(convertAmount(100000, "USD", "UAH", RATES, 20000)).toBe(4000000);
    expect(convertAmount(4000000, "UAH", "USD", RATES, 20000)).toBe(100000);
    expect(convertAmount(500, "USD", "USD", RATES, 20000)).toBe(500);
  });
});

describe("positionsFor", () => {
  it("puts the thumbs at the ends without bounds", () => {
    expect(positionsFor(HISTOGRAM, undefined, undefined)).toEqual({ lo: 0, hi: 5 });
  });

  it("snaps to bin edges", () => {
    expect(positionsFor(HISTOGRAM, 20000, 60000)).toEqual({ lo: 1, hi: 3 });
  });

  it("lower goes down to the bar holding the value, upper up to the next edge", () => {
    expect(positionsFor(HISTOGRAM, 25000, 55000)).toEqual({ lo: 1, hi: 3 });
  });

  it("a bound above the last edge means no upper limit; the thumbs never meet", () => {
    expect(positionsFor(HISTOGRAM, 90000, 500000)).toEqual({ lo: 4, hi: 5 });
    expect(positionsFor(HISTOGRAM, 41000, 41000)).toEqual({ lo: 2, hi: 3 });
  });
});

describe("valueAtPosition", () => {
  it("far left and far right are open", () => {
    expect(valueAtPosition(HISTOGRAM, 0, "lower", "USD", RATES)).toBeUndefined();
    expect(valueAtPosition(HISTOGRAM, 5, "upper", "USD", RATES)).toBeUndefined();
  });

  it("an edge in the chosen currency", () => {
    expect(valueAtPosition(HISTOGRAM, 2, "lower", "USD", RATES)).toBe(40000);
    expect(valueAtPosition(HISTOGRAM, 3, "upper", "UAH", RATES)).toBe(2400000);
  });
});

describe("countInRange", () => {
  it("everything without bounds", () => {
    expect(countInRange(HISTOGRAM, undefined, undefined)).toEqual({ count: 25, approx: false });
  });

  it("exact on bin edges", () => {
    expect(countInRange(HISTOGRAM, 20000, 60000)).toEqual({ count: 16, approx: false });
    expect(countInRange(HISTOGRAM, 60000, undefined)).toEqual({ count: 5, approx: false });
    expect(countInRange(HISTOGRAM, undefined, 40000)).toEqual({ count: 14, approx: false });
  });

  it("tolerates a one-dollar rounding at an edge", () => {
    expect(countInRange(HISTOGRAM, 19999, 60001)).toEqual({ count: 16, approx: false });
  });

  it("counts the bars a range cuts into and says it is approximate", () => {
    expect(countInRange(HISTOGRAM, 25000, 50000)).toEqual({ count: 16, approx: true });
    expect(countInRange(HISTOGRAM, 70000, undefined)).toEqual({ count: 5, approx: true });
  });

  it("swaps reversed bounds", () => {
    expect(countInRange(HISTOGRAM, 60000, 20000)).toEqual({ count: 16, approx: false });
  });

  it("a single price is the bar holding it, approximate", () => {
    expect(countInRange(HISTOGRAM, 45000, 45000)).toEqual({ count: 6, approx: true });
  });
});

describe("budgetLabel", () => {
  it("describes the range", () => {
    expect(budgetLabel(undefined, undefined, "USD")).toBe("Будь-який");
    expect(budgetLabel(undefined, 120000, "USD")).toBe("до 120 000 USD");
    expect(budgetLabel(80000, undefined, "UAH")).toBe("від 80 000 ₴");
    expect(budgetLabel(80000, 120000, "EUR")).toBe("80 000 – 120 000 EUR");
  });
});
