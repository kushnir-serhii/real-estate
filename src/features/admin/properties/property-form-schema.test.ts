import { describe, expect, it } from "vitest";
import {
  PROPERTY_FORM_FIELDS,
  parsePropertyForm,
  parsePropertyFormRaw,
  parsePropertySeoForm,
  publishRequirements,
  type PropertyFormRaw,
} from "./property-form-schema";

const blank = (): PropertyFormRaw =>
  Object.fromEntries(PROPERTY_FORM_FIELDS.map((field) => [field, ""])) as PropertyFormRaw;

const raw = (patch: Partial<PropertyFormRaw> = {}): PropertyFormRaw => ({
  ...blank(),
  deal: "sell",
  property_type: "flat",
  title: "  2-кімнатна квартира, Оболонь  ",
  ...patch,
});

const errorsOf = (patch: Partial<PropertyFormRaw>) => {
  const result = parsePropertyFormRaw(raw(patch));
  return result.ok ? null : result.errors;
};

describe("parsePropertyFormRaw", () => {
  it("accepts a minimal form: empty strings become null, text is trimmed, checkbox false", () => {
    const result = parsePropertyFormRaw(raw());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values).toMatchObject({
      deal: "sell",
      property_type: "flat",
      title: "2-кімнатна квартира, Оболонь",
      prop_kind: null,
      price_amount: null,
      currency: null,
      area_total: null,
      room_count: null,
      locality: null,
      agent_id: null,
      is_newbuilding: false,
    });
  });

  it("parses a full form, comma decimals included", () => {
    const result = parsePropertyFormRaw(
      raw({
        prop_kind: "studio",
        price_amount: "85000",
        currency: "USD",
        area_total: "54,5",
        area_life: "30.25",
        area_kitchen: "9",
        room_count: "2",
        storey: "-1",
        storeys: "9",
        repair: "evro",
        wall_material: "brick",
        housing_class: "business",
        is_newbuilding: "on",
        locality: " Київ ",
        agent_id: "3f9a1c2e-0000-4000-8000-000000000001",
        seo_title: "SEO",
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values).toMatchObject({
      price_amount: 85000,
      currency: "USD",
      area_total: 54.5,
      area_life: 30.25,
      area_kitchen: 9,
      room_count: 2,
      storey: -1,
      storeys: 9,
      is_newbuilding: true,
      locality: "Київ",
      seo_title: "SEO",
    });
  });

  it("reads FormData; missing fields count as empty", () => {
    const data = new FormData();
    data.set("deal", "rent_long");
    data.set("property_type", "house");
    data.set("title", "Будинок");
    const result = parsePropertyForm(data);
    expect(result.ok).toBe(true);
  });

  it("requires deal, type and title", () => {
    const result = parsePropertyFormRaw(blank());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(["deal", "property_type", "title"]);
  });

  it("rejects unknown enum values", () => {
    expect(errorsOf({ deal: "buy" })?.deal).toBeDefined();
    expect(errorsOf({ currency: "GBP", price_amount: "1" })?.currency).toBeDefined();
    expect(errorsOf({ repair: "nice" })?.repair).toBeDefined();
    expect(errorsOf({ wall_material: "glass" })?.wall_material).toBeDefined();
    expect(errorsOf({ housing_class: "lux" })?.housing_class).toBeDefined();
    expect(errorsOf({ agent_id: "not-a-uuid" })?.agent_id).toBeDefined();
  });

  it("checks the title length", () => {
    expect(errorsOf({ title: "   " })?.title).toBeDefined();
    expect(errorsOf({ title: "я".repeat(200) })).toBeNull();
    expect(errorsOf({ title: "я".repeat(201) })?.title).toBeDefined();
  });

  it("price: integer, non-negative; currency required when set, null when not", () => {
    expect(errorsOf({ price_amount: "-5", currency: "UAH" })?.price_amount).toBeDefined();
    expect(errorsOf({ price_amount: "10,5", currency: "UAH" })?.price_amount).toBeDefined();
    expect(errorsOf({ price_amount: "abc", currency: "UAH" })?.price_amount).toBeDefined();
    expect(errorsOf({ price_amount: "10", currency: "" })?.currency).toBeDefined();
    expect(errorsOf({ price_amount: "0", currency: "UAH" })).toBeNull();
    // A currency without a price is accepted by the schema; `derivePrice` drops it (no price -> no currency).
    expect(errorsOf({ currency: "UAH" })).toBeNull();
  });

  it("areas: non-negative, at most 2 decimals", () => {
    expect(errorsOf({ area_total: "-1" })?.area_total).toBeDefined();
    expect(errorsOf({ area_life: "1.234" })?.area_life).toBeDefined();
    expect(errorsOf({ area_kitchen: "12 m" })?.area_kitchen).toBeDefined();
    expect(errorsOf({ area_lot: "2e3" })?.area_lot).toBeDefined();
    expect(errorsOf({ area_lot: "12,34" })).toBeNull();
    expect(errorsOf({ area_total: "1000001" })?.area_total).toBeDefined();
  });

  it("integers: rooms >= 0, storey -5..200, storeys 1..200", () => {
    expect(errorsOf({ room_count: "-1" })?.room_count).toBeDefined();
    expect(errorsOf({ room_count: "2.5" })?.room_count).toBeDefined();
    expect(errorsOf({ storey: "-6" })?.storey).toBeDefined();
    expect(errorsOf({ storey: "-5" })).toBeNull();
    expect(errorsOf({ storey: "201" })?.storey).toBeDefined();
    expect(errorsOf({ storeys: "0" })?.storeys).toBeDefined();
    expect(errorsOf({ storeys: "200" })).toBeNull();
  });

  it("prop_kind must belong to the property type", () => {
    expect(errorsOf({ property_type: "flat", prop_kind: "studio" })).toBeNull();
    expect(errorsOf({ property_type: "flat", prop_kind: "single" })?.prop_kind).toBeDefined();
    expect(errorsOf({ property_type: "house", prop_kind: "single" })).toBeNull();
    expect(errorsOf({ property_type: "plot", prop_kind: "dacha" })).toBeNull();
    expect(errorsOf({ property_type: "commercial", prop_kind: "shop" })).toBeNull();
    expect(errorsOf({ property_type: "commercial", prop_kind: "studio" })?.prop_kind).toBeDefined();
  });

  it("limits text lengths", () => {
    expect(errorsOf({ locality: "а".repeat(121) })?.locality).toBeDefined();
    expect(errorsOf({ house: "1".repeat(121) })?.house).toBeDefined();
    expect(errorsOf({ description: "а".repeat(10_001) })?.description).toBeDefined();
    expect(errorsOf({ seo_title: "а".repeat(121) })?.seo_title).toBeDefined();
    expect(errorsOf({ seo_description: "а".repeat(301) })?.seo_description).toBeDefined();
    expect(errorsOf({ seo_description: "а".repeat(300) })).toBeNull();
  });

  it("keeps one message per field", () => {
    const errors = errorsOf({ price_amount: "x", currency: "" });
    expect(errors?.price_amount).toBeDefined();
  });
});

describe("parsePropertySeoForm", () => {
  it("reads only the SEO fields", () => {
    const data = new FormData();
    data.set("seo_title", " Title ");
    data.set("seo_description", "");
    data.set("title", "ignored");
    const result = parsePropertySeoForm(data);
    expect(result).toEqual({ ok: true, values: { seo_title: "Title", seo_description: null } });
  });

  it("rejects too long values", () => {
    const data = new FormData();
    data.set("seo_title", "а".repeat(121));
    const result = parsePropertySeoForm(data);
    expect(result.ok).toBe(false);
  });
});

describe("publishRequirements", () => {
  it("is empty when deal, type, locality and title are set (price is optional)", () => {
    expect(
      publishRequirements({ deal: "sell", property_type: "flat", locality: "Київ", title: "Квартира" }),
    ).toEqual([]);
  });

  it("lists every missing item in Ukrainian", () => {
    const missing = publishRequirements({ deal: null, property_type: " ", locality: null, title: "" });
    expect(missing.map((item) => item.field)).toEqual(["deal", "property_type", "locality", "title"]);
    expect(missing.every((item) => /[а-яіїєґ]/i.test(item.message))).toBe(true);
  });

  it("flags only the locality of a draft without one", () => {
    expect(
      publishRequirements({ deal: "sell", property_type: "flat", locality: null, title: "Квартира" }).map(
        (item) => item.field,
      ),
    ).toEqual(["locality"]);
  });
});

describe("number fields", () => {
  it("accept spaces as thousands separators (also no-break)", () => {
    const result = parsePropertyFormRaw({
      ...raw(),
      price_amount: "1 200\u00a0000",
      currency: "USD",
    });
    expect(result.ok && result.values.price_amount).toBe(1_200_000);
  });
});
