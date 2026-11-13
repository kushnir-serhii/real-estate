import { describe, expect, it } from "vitest";

import { formatPrice, PRICE_ON_REQUEST } from "@/lib/format/format-price";

const NBSP = " ";

describe("formatPrice", () => {
  it("shows hryvnias with the ₴ sign, never «грн»", () => {
    expect(formatPrice(2_450_000, "UAH")).toBe(`2${NBSP}450${NBSP}000${NBSP}₴`);
    expect(formatPrice(2_450_000, "UAH")).not.toContain("грн");
  });

  it("keeps USD and EUR as codes, like the server rendered before", () => {
    expect(formatPrice(85_000, "USD")).toBe(`85${NBSP}000${NBSP}USD`);
    expect(formatPrice(120_000, "EUR")).toBe(`120${NBSP}000${NBSP}EUR`);
  });

  it("matches the previous Intl output on the server for every currency", () => {
    for (const currency of ["UAH", "USD", "EUR"] as const) {
      const intl = new Intl.NumberFormat("uk-UA", { style: "currency", currency, maximumFractionDigits: 0 }).format(
        1_234_567,
      );
      expect(formatPrice(1_234_567, currency)).toBe(intl);
    }
  });

  it("rounds to whole units", () => {
    expect(formatPrice(999.6, "USD")).toBe(`1${NBSP}000${NBSP}USD`);
  });

  it("adds the rent period after « / », which the property card splits on", () => {
    expect(formatPrice(25_000, "UAH", "rent_long")).toBe(`25${NBSP}000${NBSP}₴ / міс`);
    expect(formatPrice(1_800, "UAH", "rent_day")).toBe(`1${NBSP}800${NBSP}₴ / доба`);
    expect(formatPrice(85_000, "USD", "sell")).toBe(`85${NBSP}000${NBSP}USD`);
    expect(formatPrice(25_000, "UAH", "rent_long").split(" / ")).toEqual([`25${NBSP}000${NBSP}₴`, "міс"]);
  });

  it("says «Ціна за запитом» without an amount", () => {
    expect(formatPrice(null, "USD")).toBe(PRICE_ON_REQUEST);
    expect(formatPrice(null, "UAH", "rent_long")).toBe(PRICE_ON_REQUEST);
  });
});
