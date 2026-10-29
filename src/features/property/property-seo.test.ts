import { describe, expect, it } from "vitest";

import { propertySeoDescription, propertySeoTitle, type PropertySeoInput } from "./property-seo";

const base: PropertySeoInput = {
  property_type: "flat",
  prop_kind: "isolated",
  room_count: 2,
  area_total: 62,
  area_lot: null,
  locality: "Київ",
  district: "Оболонський",
  deal: "sell",
  price_amount: 85000,
  currency: "USD",
  seo_title: null,
  seo_description: null,
};

const titleText = (p: PropertySeoInput) => {
  const t = propertySeoTitle(p);
  return typeof t === "string" ? t : t.absolute;
};

const FIXTURES: Record<string, PropertySeoInput> = {
  flat: base,
  longKind: { ...base, prop_kind: "unfinished_new_build", room_count: 3, area_total: 120.5, price_amount: 1258000 },
  rent: { ...base, deal: "rent_long", price_amount: 15000, currency: "UAH" },
  house: { ...base, property_type: "house", prop_kind: "single", room_count: 5, area_total: 210, area_lot: 8, locality: "Буча" },
  plot: { ...base, property_type: "plot", prop_kind: null, room_count: null, area_total: null, area_lot: 12 },
  noPrice: { ...base, price_amount: null, currency: null },
  sparse: { ...base, prop_kind: null, room_count: null, area_total: null, district: null, locality: null, price_amount: null, currency: null },
};

describe("propertySeoTitle", () => {
  it("builds the title from facts and price for sales", () => {
    expect(titleText(base)).toMatch(/^Квартира, 2-кімн\., 62 м², Оболонський р-н, Київ — 85 000 /);
  });

  it("uses the plain form (brand from the template) only when it fits", () => {
    expect(typeof propertySeoTitle({ ...base, district: null, room_count: null })).toBe("string");
    expect(typeof propertySeoTitle(base)).toBe("object");
  });

  it("never adds a price for rent and omits missing parts", () => {
    expect(titleText(FIXTURES.rent)).not.toMatch(/UAH|₴|грн/);
    expect(titleText(FIXTURES.sparse)).toBe("Квартира");
    expect(titleText(FIXTURES.plot)).toContain("12 сот.");
    expect(titleText(FIXTURES.plot)).not.toContain("кімн.");
  });

  it("keeps plain titles within 60 chars with the brand and absolute ones within 70", () => {
    for (const p of Object.values(FIXTURES)) {
      const t = propertySeoTitle(p);
      if (typeof t === "string") expect(`${t} — Sofiacity`.length).toBeLessThanOrEqual(60);
      else expect(t.absolute.length).toBeLessThanOrEqual(70);
    }
  });

  it("manual SEO title wins as absolute", () => {
    expect(propertySeoTitle({ ...base, seo_title: " Мій заголовок " })).toEqual({ absolute: "Мій заголовок" });
  });
});

describe("propertySeoDescription", () => {
  it("stays within 120-155 chars for realistic data", () => {
    for (const [name, p] of Object.entries(FIXTURES)) {
      if (name === "sparse") continue;
      const d = propertySeoDescription(p);
      expect(d.length, name).toBeGreaterThanOrEqual(120);
      expect(d.length, name).toBeLessThanOrEqual(155);
      expect(d).toContain("Sofiacity");
    }
  });

  it("stays within the maximum for sparse data and keeps the brand", () => {
    const d = propertySeoDescription(FIXTURES.sparse);
    expect(d.length).toBeLessThanOrEqual(155);
    expect(d).toContain("Sofiacity");
  });

  it("trims an overlong fact sentence on a word", () => {
    const d = propertySeoDescription({ ...base, locality: "Дуже довге місто ".repeat(12).trim() });
    expect(d.length).toBeLessThanOrEqual(155);
    expect(d).toContain("…");
  });

  it("manual SEO description wins", () => {
    expect(propertySeoDescription({ ...base, seo_description: " Текст " })).toBe("Текст");
  });
});
