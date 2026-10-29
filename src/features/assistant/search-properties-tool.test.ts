import { describe, expect, it, vi } from "vitest";

import type { PropertyFilters, PropertyPage, PublishedProperty } from "@/lib/db/properties";
import type { ExchangeRates } from "@/lib/db/settings";

import {
  buildSearch,
  matchDistrict,
  runSearchProperties,
  searchPropertiesArgsSchema,
  SEARCH_RESULT_LIMIT,
} from "./search-properties-tool";
import type { SearchPropertiesDeps } from "./search-properties-tool";

const RATES: ExchangeRates = { UAH: 40, EUR: 0.9 };
const DISTRICTS = ["Печерський", "Шевченківський", "Оболонь"];

const search = (args: unknown, districts: readonly string[] = DISTRICTS) =>
  buildSearch(searchPropertiesArgsSchema.parse(args), districts, RATES);

const property = (n: number, overrides: Partial<PublishedProperty> = {}): PublishedProperty =>
  // as: a test fixture; only the fields the tool reads are filled in
  ({
    id: `id-${n}`,
    slug: `kvartyra-${n}`,
    title: `Квартира ${n}`,
    deal: "sell",
    property_type: "flat",
    price_amount: 85000,
    currency: "USD",
    room_count: 2,
    area_total: 54.5,
    district: "Печерський",
    property_photos: [],
    ...overrides,
  }) as PublishedProperty;

const depsOf = (items: PublishedProperty[], total = items.length) => {
  const getProperties = vi.fn<(filters: PropertyFilters) => Promise<PropertyPage>>(async () => ({
    items,
    total,
    page: 1,
    pageCount: 1,
  }));
  const deps: SearchPropertiesDeps = {
    getProperties,
    getRates: async () => RATES,
    getDistricts: async () => DISTRICTS,
  };
  return { deps, getProperties };
};

describe("buildSearch", () => {
  it("maps deal words to the catalog's deals", () => {
    expect(search({ deal: "buy" }).filters.deal).toBe("sell");
    expect(search({ deal: "rent" }).filters.deal).toBe("rent_long");
    expect(search({ deal: "rent_daily" }).filters.deal).toBe("rent_day");
  });

  it("keeps USD budgets as they are and builds the same catalog link", () => {
    const { filters, catalogUrl } = search({ deal: "buy", property_type: "flat", budget_from: 50000, budget_to: 80000 });
    expect(filters).toMatchObject({ price_usd_from: 50000, price_usd_to: 80000, deal: "sell", property_type: "flat" });
    expect(catalogUrl).toBe("/catalog?deal=sell&property_type=flat&price_from=50000&price_to=80000&currency=USD");
  });

  it("converts UAH and EUR budgets to USD like the catalog (bounds widen)", () => {
    const uah = search({ budget_from: 1_000_001, budget_to: 3_000_000, currency: "UAH" });
    expect(uah.filters.price_usd_from).toBe(Math.floor(1_000_001 / 40));
    expect(uah.filters.price_usd_to).toBe(75000);
    expect(uah.catalogUrl).toContain("currency=UAH");
    expect(uah.catalogUrl).toContain("price_to=3000000");

    const eur = search({ budget_to: 90000, currency: "EUR" });
    expect(eur.filters.price_usd_to).toBe(Math.ceil(90000 / 0.9));
    expect(eur.catalogUrl).toBe("/catalog?price_to=90000&currency=EUR");
  });

  it("defaults the currency to USD and swaps a reversed budget", () => {
    const { filters } = search({ budget_from: 90000, budget_to: 50000 });
    expect(filters).toMatchObject({ price_usd_from: 50000, price_usd_to: 90000 });
  });

  it("accepts rooms as strings or numbers, 5 and more as 5+", () => {
    const { filters, catalogUrl } = search({ property_type: "flat", rooms: [2, "3", 6] });
    expect(filters.rooms).toEqual(["2", "3", "5+"]);
    expect(catalogUrl).toBe("/catalog?property_type=flat&rooms=2&rooms=3&rooms=5%2B");
  });

  it("drops rooms for plots, as the catalog does", () => {
    expect(search({ property_type: "plot", rooms: [2] }).filters.rooms).toBeUndefined();
  });

  it("matches a district case-insensitively and puts it in the link", () => {
    const result = search({ district: "печерський" });
    expect(result.filters.district).toEqual(["Печерський"]);
    expect(result.ignoredDistrict).toBeNull();
    expect(result.catalogUrl).toBe(`/catalog?district=${encodeURIComponent("Печерський")}`);
  });

  it("ignores an unknown district and reports it", () => {
    const result = search({ district: "Марс" });
    expect(result.filters.district).toBeUndefined();
    expect(result.ignoredDistrict).toBe("Марс");
    expect(result.catalogUrl).toBe("/catalog");
  });

  it("passes the sort through and leaves the default out of the link", () => {
    expect(search({ sort: "price_asc" }).catalogUrl).toBe("/catalog?sort=price_asc");
    expect(search({}).filters.sort).toBe("newest");
  });

  it("treats null arguments as not set", () => {
    const { filters } = search({ deal: null, rooms: null, budget_to: null, district: null });
    expect(filters.deal).toBeUndefined();
    expect(filters.rooms).toBeUndefined();
  });
});

describe("matchDistrict", () => {
  it("prefers an exact match, accepts a single partial one and rejects ambiguity", () => {
    expect(matchDistrict("ОБОЛОНЬ", DISTRICTS)).toBe("Оболонь");
    expect(matchDistrict("печерськ", DISTRICTS)).toBe("Печерський");
    expect(matchDistrict("ький", DISTRICTS)).toBeNull();
    expect(matchDistrict("  ", DISTRICTS)).toBeNull();
  });
});

describe("searchPropertiesArgsSchema", () => {
  it("rejects bad values", () => {
    expect(searchPropertiesArgsSchema.safeParse({ deal: "swap" }).success).toBe(false);
    expect(searchPropertiesArgsSchema.safeParse({ budget_to: -5 }).success).toBe(false);
    expect(searchPropertiesArgsSchema.safeParse({ budget_to: "80000" }).success).toBe(false);
    expect(searchPropertiesArgsSchema.safeParse({ property_type: "castle" }).success).toBe(false);
  });
});

describe("runSearchProperties", () => {
  it("returns a compact result for the model and cards for the client, at most 5", async () => {
    const items = Array.from({ length: 8 }, (_, i) => property(i + 1));
    const { deps, getProperties } = depsOf(items, 23);
    const outcome = await runSearchProperties(JSON.stringify({ deal: "buy", budget_to: 90000 }), deps);

    expect(getProperties).toHaveBeenCalledWith(expect.objectContaining({ deal: "sell", price_usd_to: 90000 }));
    const model = JSON.parse(outcome.content);
    expect(model.total).toBe(23);
    expect(model.shown).toBe(SEARCH_RESULT_LIMIT);
    expect(model.items).toHaveLength(SEARCH_RESULT_LIMIT);
    expect(model.items[0]).toEqual({
      title: "Квартира 1",
      price: expect.stringMatching(/85\s000/),
      deal: "Продаж",
      type: "Квартира",
      rooms: 2,
      area_m2: 54.5,
      district: "Печерський",
      url: "/catalog/kvartyra-1",
    });
    expect(outcome.event).toMatchObject({
      type: "properties",
      total: 23,
      catalog_url: "/catalog?deal=sell&price_to=90000&currency=USD",
    });
    expect(outcome.event?.items).toHaveLength(SEARCH_RESULT_LIMIT);
    expect(outcome.event?.items[0]).toEqual({
      slug: "kvartyra-1",
      title: "Квартира 1",
      price: expect.stringMatching(/85\s000/),
      rooms: 2,
      area_total: 54.5,
      district: "Печерський",
      photo_url: null,
      url: "/catalog/kvartyra-1",
    });
  });

  it("uses the smallest size of the first photo and a rent suffix", async () => {
    const item = property(1, {
      deal: "rent_long",
      price_amount: 12000,
      currency: "UAH",
      property_photos: [
        {
          id: "p1",
          position: 0,
          r2_key: "a/orig.jpg",
          width: 1600,
          height: 900,
          sizes: { "1280": "a/1280.webp", "320": "a/320.webp" },
        },
      ],
    });
    const outcome = await runSearchProperties("{}", depsOf([item]).deps);
    expect(outcome.event?.items[0]?.photo_url).toMatch(/a\/320\.webp$/);
    expect(outcome.event?.items[0]?.price).toContain("/ міс");
  });

  it("tells the model about an unknown district but still searches", async () => {
    const { deps, getProperties } = depsOf([property(1)]);
    const outcome = await runSearchProperties(JSON.stringify({ district: "Марс" }), deps);
    const model = JSON.parse(outcome.content);
    expect(model.district_ignored).toContain("Марс");
    expect(model.available_districts).toEqual(DISTRICTS);
    expect(getProperties.mock.calls[0]?.[0].district).toBeUndefined();
  });

  it("reports an empty result with total 0 and still emits the event", async () => {
    const outcome = await runSearchProperties("{}", depsOf([]).deps);
    expect(JSON.parse(outcome.content)).toMatchObject({ total: 0, shown: 0, items: [] });
    expect(outcome.event).toMatchObject({ type: "properties", total: 0, items: [] });
  });

  it("answers invalid arguments with a tool result instead of throwing, without searching", async () => {
    const { deps, getProperties } = depsOf([property(1)]);
    for (const raw of ["not json", JSON.stringify({ deal: "swap" }), "[1]", JSON.stringify({ rooms: "two" })]) {
      const outcome = await runSearchProperties(raw, deps);
      expect(JSON.parse(outcome.content).error).toBe("invalid_arguments");
      expect(outcome.event).toBeUndefined();
    }
    expect(getProperties).not.toHaveBeenCalled();
  });

  it("treats empty arguments as no filters", async () => {
    const { deps, getProperties } = depsOf([property(1)]);
    await runSearchProperties("", deps);
    expect(getProperties).toHaveBeenCalledTimes(1);
  });

  it("turns a data failure into a tool result", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const deps: SearchPropertiesDeps = {
      getProperties: async () => {
        throw new Error("db down");
      },
      getRates: async () => RATES,
      getDistricts: async () => [],
    };
    const outcome = await runSearchProperties("{}", deps);
    expect(JSON.parse(outcome.content).error).toBe("search_failed");
    expect(outcome.event).toBeUndefined();
  });
});
