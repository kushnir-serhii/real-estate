import { describe, expect, it } from "vitest";

import { ASSISTANT_FAQ } from "@/constants/assistant";

import { buildSystemPrompt } from "./build-system-prompt";
import type { PromptProperty } from "./build-system-prompt";

const property: PromptProperty = {
  slug: "kvartyra-pechersk",
  title: "2-кімнатна квартира на Печерську",
  deal: "sell",
  property_type: "flat",
  price_amount: 85000,
  currency: "USD",
  room_count: 2,
  district: "Печерський",
};

describe("buildSystemPrompt", () => {
  it("includes the persona, rules and every FAQ entry", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("Софія");
    expect(prompt).toContain("Ніколи не вигадуй");
    for (const entry of ASSISTANT_FAQ) expect(prompt).toContain(entry.question);
    expect(prompt).not.toContain("цей об'єкт нашого каталогу");
  });

  it("tells the model to search before naming properties and to use only the results", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("search_properties");
    expect(prompt).toContain("Не називай жодного об'єкта");
    expect(prompt).toContain("total = 0");
  });

  it("adds the current property with price, deal, type, rooms, district and url", () => {
    const prompt = buildSystemPrompt(property);
    expect(prompt).toContain(property.title);
    expect(prompt).toContain("Продаж");
    expect(prompt).toContain("Квартира");
    expect(prompt).toContain("Кімнат: 2");
    expect(prompt).toContain("Печерський");
    expect(prompt).toContain("/catalog/kvartyra-pechersk");
    expect(prompt).toMatch(/85\s000/);
    expect(prompt).toContain("схожі");
  });
});
