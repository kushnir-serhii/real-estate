import { describe, expect, it } from "vitest";

import { FIXTURE_DEFS } from "@/lib/plektan/fixtures/data";

import { parsePrice } from "./parse-price";

describe("parsePrice", () => {
  const cases: [string, ReturnType<typeof parsePrice>][] = [
    ["&asymp; 85 000 $", { amount: 85000, currency: "USD", perM2: false }],
    ["&asymp; 1 250 $/м²", { amount: 1250, currency: "USD", perM2: true }],
    ["145 000 €", { amount: 145000, currency: "EUR", perM2: false }],
    ["18 000 грн/міс", { amount: 18000, currency: "UAH", perM2: false }],
    ["1 200 грн/доба", { amount: 1200, currency: "UAH", perM2: false }],
    ["1 100 $ / міс", { amount: 1100, currency: "USD", perM2: false }],
    ["450 €/м²", { amount: 450, currency: "EUR", perM2: true }],
    ["1 800 000 грн", { amount: 1800000, currency: "UAH", perM2: false }],
    ["178 500 $", { amount: 178500, currency: "USD", perM2: false }],
    ["&asymp;&nbsp;85&nbsp;000&nbsp;$", { amount: 85000, currency: "USD", perM2: false }],
    ["85 000 $", { amount: 85000, currency: "USD", perM2: false }],
    ["1 250,50 $", { amount: 1251, currency: "USD", perM2: false }],
    ["1,200,000 грн", { amount: 1200000, currency: "UAH", perM2: false }],
    ["1.200.000 UAH", { amount: 1200000, currency: "UAH", perM2: false }],
    ["50 000 дол.", { amount: 50000, currency: "USD", perM2: false }],
    ["₴ 9 500", { amount: 9500, currency: "UAH", perM2: false }],
    ["30 EUR за м²", { amount: 30, currency: "EUR", perM2: true }],
  ];

  it.each(cases)("%s", (text, expected) => {
    expect(parsePrice(text)).toEqual(expected);
  });

  it.each([[""], ["   "], ["Договірна"], ["договірна"], ["&nbsp;"], ["Ціна за домовленістю"], ["0 $"], ["85 000"]])(
    "%j -> no price",
    (text) => {
      expect(parsePrice(text)).toBeNull();
    },
  );

  it("null / undefined -> no price", () => {
    expect(parsePrice(null)).toBeNull();
    expect(parsePrice(undefined)).toBeNull();
  });

  it("parses every price text found in the fixtures (both sets) except the negotiable one", () => {
    const texts = new Set<string>();
    for (const defs of Object.values(FIXTURE_DEFS)) {
      for (const def of defs) {
        texts.add(def.price.value);
        if (def.price.value_m2) texts.add(def.price.value_m2);
      }
    }
    expect(texts.size).toBeGreaterThan(10);
    for (const text of texts) {
      if (text === "Договірна") expect(parsePrice(text)).toBeNull();
      else expect(parsePrice(text), text).not.toBeNull();
    }
  });
});

describe("parsePrice with two currencies", () => {
  it("takes the currency mentioned first", () => {
    expect(parsePrice("&asymp; 3 500 000 грн ($85 000)")).toEqual({ amount: 3_500_000, currency: "UAH", perM2: false });
    expect(parsePrice("85 000 $ (3 500 000 грн)")).toEqual({ amount: 85_000, currency: "USD", perM2: false });
  });
});
