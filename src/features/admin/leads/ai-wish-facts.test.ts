import { describe, expect, it } from "vitest";

import { aiWishFacts } from "./ai-wish-facts";

describe("aiWishFacts", () => {
  it("is empty without AI wishes", () => {
    expect(aiWishFacts({ deal: "buy", propertyType: "flat" })).toEqual([]);
  });

  it("labels every AI wish in reading order", () => {
    expect(
      aiWishFacts({
        timing: "до літа",
        payment: "mortgage",
        budget: { from: 50000, to: 80000, currency: "USD" },
        rooms: ["2", "3"],
        districts: ["Центр", "Оболонь"],
        summary: "Двокімнатна для сім'ї",
      }),
    ).toEqual([
      { label: "Суть запиту", text: "Двокімнатна для сім'ї" },
      { label: "Райони", text: "Центр, Оболонь" },
      { label: "Кімнат", text: "2, 3", numeric: true },
      { label: "Бюджет", text: "від 50 000 до 80 000 $", numeric: true },
      { label: "Оплата", text: "Іпотека" },
      { label: "Терміни", text: "до літа" },
    ]);
  });

  it("formats a one-sided budget with its currency", () => {
    expect(aiWishFacts({ budget: { to: 3000000, currency: "UAH" } })).toEqual([
      { label: "Бюджет", text: "до 3 000 000 грн", numeric: true },
    ]);
  });
});
