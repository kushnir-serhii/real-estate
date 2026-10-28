import { describe, expect, it } from "vitest";

import {
  canonicalPath,
  catalogHref,
  catalogTitle,
  countActiveFilters,
  isIndexable,
  objectsLabel,
  parseCatalogState,
  resetHref,
  toPropertyFilters,
} from "./catalog-params";

const RATES = { UAH: 40, EUR: 0.9 };

describe("parseCatalogState", () => {
  it("reads the home quick search URL", () => {
    const state = parseCatalogState({
      deal: "rent_long",
      property_type: "flat",
      rooms: "2",
      price_to: "20000",
      currency: "UAH",
    });
    expect(state).toMatchObject({
      deal: "rent_long",
      property_type: "flat",
      rooms: ["2"],
      price_to: 20000,
      currency: "UAH",
      sort: "newest",
      page: 1,
    });
    const filters = toPropertyFilters(state, RATES);
    expect(filters.price_usd_to).toBe(500);
    expect(filters.rooms).toEqual(["2"]);
  });

  it("ignores empty and invalid values", () => {
    const state = parseCatalogState({
      deal: "buy",
      property_type: "castle",
      rooms: ["2", "9", ""],
      price_from: "abc",
      price_to: "",
      currency: "GBP",
      area_from: "-5",
      sort: "random",
      page: "0",
      district: "",
    });
    expect(state).toEqual({
      deal: undefined,
      property_type: undefined,
      prop_kind: undefined,
      rooms: ["2"],
      currency: "USD",
      price_from: undefined,
      price_to: undefined,
      area_from: undefined,
      area_to: undefined,
      district: undefined,
      sort: "newest",
      page: 1,
    });
  });

  it("keeps a kind only when it belongs to the type", () => {
    expect(parseCatalogState({ property_type: "flat", prop_kind: "studio" }).prop_kind).toBe("studio");
    expect(parseCatalogState({ property_type: "house", prop_kind: "studio" }).prop_kind).toBeUndefined();
    expect(parseCatalogState({ prop_kind: "studio" }).prop_kind).toBeUndefined();
  });

  it("drops rooms and area for plots", () => {
    const state = parseCatalogState({ property_type: "plot", rooms: "2", area_from: "50" });
    expect(state.rooms).toEqual([]);
    expect(state.area_from).toBeUndefined();
  });

  it("swaps reversed bounds and widens converted prices", () => {
    const state = parseCatalogState({ price_from: "1001", price_to: "10", currency: "EUR" });
    expect(state).toMatchObject({ price_from: 10, price_to: 1001 });
    const filters = toPropertyFilters(state, RATES);
    expect(filters.price_usd_from).toBe(11);
    expect(filters.price_usd_to).toBe(1113);
  });

  it("accepts repeated and comma-separated rooms", () => {
    expect(parseCatalogState({ rooms: ["3", "1"] }).rooms).toEqual(["1", "3"]);
    expect(parseCatalogState({ rooms: "1,5+" }).rooms).toEqual(["1", "5+"]);
  });
});

describe("links and labels", () => {
  it("builds clean hrefs and keeps filters across pages", () => {
    const state = parseCatalogState({ deal: "sell", rooms: ["1", "2"], price_to: "100000", page: "3" });
    expect(catalogHref(state)).toBe(
      "/catalog?deal=sell&rooms=1&rooms=2&price_to=100000&currency=USD&page=3",
    );
    expect(catalogHref(state, { page: 1 })).toBe(
      "/catalog?deal=sell&rooms=1&rooms=2&price_to=100000&currency=USD",
    );
    expect(catalogHref(parseCatalogState({}))).toBe("/catalog");
  });

  it("counts filters and resets to the deal section", () => {
    const state = parseCatalogState({ deal: "sell", property_type: "flat", rooms: ["1", "2"] });
    expect(countActiveFilters(state)).toBe(3);
    expect(resetHref(state)).toBe("/catalog?deal=sell");
    expect(resetHref(parseCatalogState({ deal: "sell" }))).toBe("/catalog");
  });

  it("titles by deal and type", () => {
    expect(catalogTitle({ deal: "sell", property_type: "flat" })).toBe("Продаж квартир");
    expect(catalogTitle({ deal: "rent_long" })).toBe("Оренда нерухомості");
    expect(catalogTitle({ property_type: "plot" })).toBe("Ділянки");
    expect(catalogTitle({})).toBe("Усі об'єкти");
  });

  it("indexes only the plain catalog and deal sections", () => {
    expect(isIndexable(parseCatalogState({}))).toBe(true);
    expect(isIndexable(parseCatalogState({ deal: "sell" }))).toBe(true);
    expect(canonicalPath(parseCatalogState({ deal: "sell" }))).toBe("/catalog?deal=sell");
    expect(isIndexable(parseCatalogState({ deal: "sell", rooms: "2" }))).toBe(false);
    expect(canonicalPath(parseCatalogState({ deal: "sell", rooms: "2" }))).toBe("/catalog");
    expect(isIndexable(parseCatalogState({ page: "2" }))).toBe(false);
  });

  it("uses Ukrainian plurals", () => {
    expect(objectsLabel(1)).toBe("1 об'єкт");
    expect(objectsLabel(3)).toBe("3 об'єкти");
    expect(objectsLabel(5)).toBe("5 об'єктів");
    expect(objectsLabel(21)).toBe("21 об'єкт");
    expect(objectsLabel(0)).toBe("0 об'єктів");
  });
});
