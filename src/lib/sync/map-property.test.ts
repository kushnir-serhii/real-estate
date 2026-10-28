import { describe, expect, it } from "vitest";

import { FIXTURE_SETS } from "@/lib/plektan/fixtures/data";
import {
  createPlektanClient,
  PLEKTAN_DEALS,
  PLEKTAN_PROPERTIES,
  type PlektanListItem,
  type PlektanViewItem,
} from "@/lib/plektan";

import { mapProperty, parseKyivDateTime, type MapPropertyResult } from "./map-property";

const RATES = { UAH: 40, EUR: 0.8 };

type Loaded = { item: PlektanListItem; view: PlektanViewItem };

const loadSet = async (fixtureSet: string): Promise<Loaded[]> => {
  const client = createPlektanClient({ fixtureSet });
  const out: Loaded[] = [];
  for (const deal of PLEKTAN_DEALS) {
    for (const property of PLEKTAN_PROPERTIES) {
      const page = await client.searchAll({ deal, property, prop_kind: [] });
      for (const item of page.items) {
        out.push({ item, view: await client.view({ adid: item.adid }) });
      }
    }
  }
  return out;
};

const base = await loadSet("base");
const next = await loadSet("next");

const find = (set: Loaded[], adid: string): Loaded => {
  const found = set.find((entry) => entry.item.adid === adid);
  if (found === undefined) throw new Error(`fixture ${adid} missing`);
  return found;
};

const mapRow = (adid: string, set: Loaded[] = base) => {
  const { item, view } = find(set, adid);
  const result = mapProperty(item, view, RATES);
  if (result.kind !== "row") throw new Error(`${adid} was skipped: ${result.reason}`);
  return result;
};

describe("mapProperty on fixtures", () => {
  it("maps every item of both sets without throwing; only the MLS one is skipped", () => {
    for (const set of [base, next]) {
      for (const { item, view } of set) {
        const result: MapPropertyResult = mapProperty(item, view, RATES);
        if (item.adid === "1011") expect(result).toEqual({ kind: "skip", reason: "mls" });
        else expect(result.kind).toBe("row");
      }
    }
    expect(FIXTURE_SETS).toEqual(["base", "next"]);
  });

  it("skips non-actual and unsupported items", () => {
    const { item, view } = find(base, "1001");
    expect(mapProperty({ ...item, state: "closed" }, view, RATES)).toEqual({ kind: "skip", reason: "not_actual" });
    expect(mapProperty({ ...item, deal: "buy" }, view, RATES)).toEqual({ kind: "skip", reason: "unsupported" });
    expect(mapProperty({ ...item, property: null }, view, RATES)).toEqual({ kind: "skip", reason: "unsupported" });
  });

  it("flat for sale: &asymp; USD price, per m2 from the text, address, agent", () => {
    const { row, agentExternalId } = mapRow("1001");
    expect(row).toMatchObject({
      source: "plektan",
      external_id: "1001",
      deal: "sell",
      property_type: "flat",
      prop_kind: "isolated",
      price_amount: 85000,
      currency: "USD",
      price_usd: 85000,
      price_per_m2: 1250,
      area_total: 68,
      area_life: 41,
      room_count: 2,
      storey: 7,
      storeys: 16,
      repair: "evro",
      locality: "Київ",
      district: "Оболонь",
      street: "проспект Оболонський",
      house: "26",
      title: "2-кімнатна квартира, Оболонь",
      source_updated_at: "2026-10-10T09:00:00.000Z",
    });
    expect(row.description).toContain("Світла двокімнатна квартира");
    expect(row.raw).toMatchObject({ adid: 1001 });
    expect(agentExternalId).toBe("501");
  });

  it("EUR price converts to USD with the rate (units per 1 USD)", () => {
    const { row } = mapRow("1002");
    expect(row).toMatchObject({ price_amount: 145000, currency: "EUR", price_usd: 181250 });
    expect(row.price_per_m2).toBe(Math.round(145000 / 52));
  });

  it("UAH price (грн/міс, грн/доба, plain грн)", () => {
    expect(mapRow("1003").row).toMatchObject({ price_amount: 18000, currency: "UAH", price_usd: 450 });
    expect(mapRow("1004").row).toMatchObject({ price_amount: 1200, currency: "UAH", price_usd: 30 });
    expect(mapRow("1010").row).toMatchObject({ price_amount: 1800000, currency: "UAH", price_usd: 45000 });
  });

  it("'1 100 $ / міс' and plot prices", () => {
    expect(mapRow("1006").row).toMatchObject({ price_amount: 1100, currency: "USD", price_usd: 1100 });
    expect(mapRow("1009").row).toMatchObject({ price_amount: 45000, currency: "USD" });
  });

  it("price per m2 headline: total = per m2 * area", () => {
    const { row } = mapRow("1008");
    expect(row).toMatchObject({ price_per_m2: 450, price_amount: 63000, currency: "EUR", price_usd: 78750 });
  });

  it("'Договірна' -> no price at all", () => {
    expect(mapRow("1012").row).toMatchObject({
      price_amount: null,
      currency: null,
      price_usd: null,
      price_per_m2: null,
    });
  });

  it("plain-number price with m2 value_m2", () => {
    expect(mapRow("1007").row).toMatchObject({ price_amount: 178500, price_per_m2: 2100, currency: "USD" });
  });

  it("changed price in `next`", () => {
    expect(mapRow("1001", next).row).toMatchObject({ price_amount: 82000, price_per_m2: 1206 });
    expect(mapRow("1013", next).row).toMatchObject({ price_amount: 71500, price_per_m2: 1300 });
  });

  it("empty house string -> null, no photos item still maps", () => {
    expect(mapRow("1010").row.house).toBeNull();
    expect(mapRow("1010").row.street).toBeNull();
  });

  it("unknown list values become null, known ones stay", () => {
    const { item, view } = find(base, "1001");
    const result = mapProperty({ ...item, repair: "weird", wall_material: "brick", housing_class: "nope" }, view, RATES);
    if (result.kind !== "row") throw new Error("skipped");
    expect(result.row).toMatchObject({ repair: null, wall_material: "brick", housing_class: null });
  });

  it("without a view: no description, house or agent", () => {
    const { item } = find(base, "1001");
    const result = mapProperty(item, null, RATES);
    if (result.kind !== "row") throw new Error("skipped");
    expect(result.row).toMatchObject({ description: null, house: null });
    expect(result.agentExternalId).toBeNull();
  });
});

describe("parseKyivDateTime", () => {
  it("handles summer and winter time", () => {
    expect(parseKyivDateTime("2026-07-01 12:00:00")).toBe("2026-07-01T09:00:00.000Z");
    expect(parseKyivDateTime("2026-12-01 12:00")).toBe("2026-12-01T10:00:00.000Z");
  });

  it("garbage -> null", () => {
    expect(parseKyivDateTime(null)).toBeNull();
    expect(parseKyivDateTime("вчора")).toBeNull();
  });
});
