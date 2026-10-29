import { describe, expect, it } from "vitest";
import {
  adminPropertiesSearchParams,
  externalIdQuery,
  parseAdminPropertyFilters,
  propertySearchOr,
  quoteOrValue,
} from "./admin-property-filters";

const base = { status: "all", source: "all", deal: "all", type: "all", page: 1 } as const;

describe("parseAdminPropertyFilters", () => {
  it("defaults when empty", () => {
    expect(parseAdminPropertyFilters({})).toEqual(base);
  });

  it("parses valid values and takes the first of arrays", () => {
    expect(
      parseAdminPropertyFilters({ status: ["draft", "hidden"], source: "plektan", deal: "sell", type: "flat", q: "  Київ ", page: "3" }),
    ).toEqual({ status: "draft", source: "plektan", deal: "sell", type: "flat", q: "Київ", page: 3 });
  });

  it("falls back on invalid values", () => {
    expect(
      parseAdminPropertyFilters({ status: "x", source: "y", deal: "z", type: "w", q: "   ", page: "-2" }),
    ).toEqual(base);
    expect(parseAdminPropertyFilters({ page: "abc" }).page).toBe(1);
    expect(parseAdminPropertyFilters({ page: "2.5" }).page).toBe(1);
  });

  it("trims q to 100 chars", () => {
    expect(parseAdminPropertyFilters({ q: "a".repeat(150) }).q).toHaveLength(100);
  });
});

describe("adminPropertiesSearchParams", () => {
  it("drops defaults", () => {
    expect(adminPropertiesSearchParams(base).toString()).toBe("");
  });

  it("keeps the page when only the page changes", () => {
    const f = { ...base, status: "draft" as const, q: "а б", page: 2 };
    expect(adminPropertiesSearchParams(f).toString()).toBe("status=draft&q=%D0%B0+%D0%B1&page=2");
    expect(adminPropertiesSearchParams(f, { page: 3 }).get("page")).toBe("3");
  });

  it("resets the page when a filter changes", () => {
    const f = { ...base, source: "admin" as const, page: 4 };
    expect(adminPropertiesSearchParams(f, { status: "published" }).toString()).toBe("status=published&source=admin");
    expect(adminPropertiesSearchParams(f, { source: "all" }).toString()).toBe("");
  });
});

describe("search", () => {
  it("quotes and escapes or-values", () => {
    expect(quoteOrValue('a,(b)"c\\')).toBe('"a,(b)\\"c\\\\"');
  });

  it("detects external ids", () => {
    expect(externalIdQuery("№ 12 345")).toBe("12345");
    expect(externalIdQuery("12a")).toBeNull();
  });

  it("builds the or expression", () => {
    expect(propertySearchOr("12345")).toBe('external_id.eq."12345",title.ilike."%12345%"');
    expect(propertySearchOr("вул. Б,(1)_")).toBe(
      ["title", "locality", "district", "street"].map((c) => `${c}.ilike."%вул. Б,(1)\\\\_%"`).join(","),
    );
  });
});
