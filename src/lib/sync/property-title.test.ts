import { describe, expect, it } from "vitest";

import { buildPropertyTitle, type TitleInput } from "./property-title";

const input = (overrides: Partial<TitleInput>): TitleInput => ({
  property_type: "flat",
  prop_kind: null,
  room_count: null,
  area_total: null,
  area_lot: null,
  locality: null,
  district: null,
  ...overrides,
});

describe("buildPropertyTitle", () => {
  it("flat: rooms + district", () => {
    expect(
      buildPropertyTitle(input({ prop_kind: "isolated", room_count: 2, locality: "Київ", district: "Оболонь" })),
    ).toBe("2-кімнатна квартира, Оболонь");
  });

  it("flat kinds", () => {
    expect(buildPropertyTitle(input({ prop_kind: "studio", room_count: 1, locality: "Київ" }))).toBe(
      "Квартира-студія, Київ",
    );
    expect(buildPropertyTitle(input({ prop_kind: "penthouse", locality: "Київ" }))).toBe("Пентхаус, Київ");
    expect(buildPropertyTitle(input({ prop_kind: "gostinka", locality: "Київ" }))).toBe("Гостинка, Київ");
    expect(buildPropertyTitle(input({ locality: "Київ" }))).toBe("Квартира, Київ");
  });

  it("house: area + locality", () => {
    expect(buildPropertyTitle(input({ property_type: "house", prop_kind: "single", area_total: 240, locality: "Козин" }))).toBe(
      "Будинок 240 м², Козин",
    );
    expect(
      buildPropertyTitle(input({ property_type: "house", prop_kind: "town_house", area_total: 130, locality: "Ірпінь" })),
    ).toBe("Таунхаус 130 м², Ірпінь");
    expect(buildPropertyTitle(input({ property_type: "house", prop_kind: "part", locality: "Ірпінь" }))).toBe(
      "Частина будинку, Ірпінь",
    );
  });

  it("plot: sotky, no trailing .0", () => {
    expect(buildPropertyTitle(input({ property_type: "plot", area_lot: 12, locality: "Ірпінь" }))).toBe(
      "Ділянка 12 сот., Ірпінь",
    );
    expect(buildPropertyTitle(input({ property_type: "plot", area_lot: 12.0, locality: "Ірпінь" }))).not.toContain(".0");
    expect(buildPropertyTitle(input({ property_type: "plot", area_lot: 7.5, locality: "Ірпінь" }))).toBe(
      "Ділянка 7,5 сот., Ірпінь",
    );
  });

  it("commercial: label from prop_kind, fallback", () => {
    expect(
      buildPropertyTitle(
        input({ property_type: "commercial", prop_kind: "office_center", area_total: 85, locality: "Київ", district: "Печерськ" }),
      ),
    ).toBe("Офіс 85 м², Печерськ");
    expect(
      buildPropertyTitle(input({ property_type: "commercial", prop_kind: "shop", area_total: 140, locality: "Київ" })),
    ).toBe("Торгове приміщення 140 м², Київ");
    expect(buildPropertyTitle(input({ property_type: "commercial", prop_kind: "storehouse", area_total: 500 }))).toBe(
      "Склад 500 м²",
    );
    expect(buildPropertyTitle(input({ property_type: "commercial", prop_kind: null, locality: "Київ" }))).toBe(
      "Комерційне приміщення, Київ",
    );
  });

  it("blank district falls back to locality", () => {
    expect(buildPropertyTitle(input({ district: "  ", locality: "Київ" }))).toBe("Квартира, Київ");
  });
});
