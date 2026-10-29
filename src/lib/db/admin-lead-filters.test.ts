import { describe, expect, it } from "vitest";
import {
  adminLeadsSearchParams,
  escapeLikeValue,
  kyivDayBounds,
  leadSearch,
  parseAdminLeadFilters,
} from "./admin-lead-filters";

const base = { failed: false, page: 1 } as const;

describe("parseAdminLeadFilters", () => {
  it("defaults when empty", () => {
    expect(parseAdminLeadFilters({})).toEqual({ failed: false, page: 1 });
  });

  it("parses valid values and takes the first of arrays", () => {
    expect(
      parseAdminLeadFilters({ kind: ["ai", "general"], from: "2026-10-01", to: "2026-10-05", q: ["  Олена ", "x"], failed: ["1"], page: "3" }),
    ).toEqual({ kind: "ai", from: "2026-10-01", to: "2026-10-05", q: "Олена", failed: true, page: 3 });
  });

  it("falls back on invalid values", () => {
    expect(
      parseAdminLeadFilters({ kind: "nope", from: "2026-13-40", to: "yesterday", q: "   ", failed: "true", page: "-2" }),
    ).toEqual({ failed: false, page: 1 });
    expect(parseAdminLeadFilters({ page: "abc" }).page).toBe(1);
    expect(parseAdminLeadFilters({ page: "2.5" }).page).toBe(1);
    expect(parseAdminLeadFilters({ from: "2026-02-30" }).from).toBeUndefined();
  });

  it("trims q to 100 chars", () => {
    expect(parseAdminLeadFilters({ q: "a".repeat(150) }).q).toHaveLength(100);
  });

  it("swaps from and to when reversed", () => {
    const f = parseAdminLeadFilters({ from: "2026-10-10", to: "2026-10-01" });
    expect([f.from, f.to]).toEqual(["2026-10-01", "2026-10-10"]);
  });
});

describe("adminLeadsSearchParams", () => {
  it("drops defaults", () => {
    expect(adminLeadsSearchParams(base).toString()).toBe("");
  });

  it("builds a query and keeps the page when only the page changes", () => {
    const f = { ...base, kind: "general" as const, q: "067 1", failed: true, page: 2 };
    expect(adminLeadsSearchParams(f).toString()).toBe("kind=general&q=067+1&failed=1&page=2");
    expect(adminLeadsSearchParams(f, { page: 3 }).get("page")).toBe("3");
  });

  it("resets the page when a filter changes; undefined removes a filter", () => {
    const f = { ...base, kind: "ai" as const, page: 4 };
    expect(adminLeadsSearchParams(f, { failed: true }).toString()).toBe("kind=ai&failed=1");
    expect(adminLeadsSearchParams(f, { kind: undefined }).toString()).toBe("");
  });
});

describe("kyivDayBounds", () => {
  it("winter (UTC+2) and summer (UTC+3)", () => {
    expect(kyivDayBounds("2026-01-15", "2026-01-15")).toEqual({
      gte: "2026-01-14T22:00:00.000Z",
      lt: "2026-01-15T22:00:00.000Z",
    });
    expect(kyivDayBounds("2026-07-01", "2026-07-01")).toEqual({
      gte: "2026-06-30T21:00:00.000Z",
      lt: "2026-07-01T21:00:00.000Z",
    });
  });

  it("spring forward on 2026-03-29 (day is 23h)", () => {
    expect(kyivDayBounds("2026-03-29", "2026-03-29")).toEqual({
      gte: "2026-03-28T22:00:00.000Z",
      lt: "2026-03-29T21:00:00.000Z",
    });
    expect(kyivDayBounds("2026-03-30").gte).toBe("2026-03-29T21:00:00.000Z");
  });

  it("fall back on 2026-10-25 (day is 25h)", () => {
    expect(kyivDayBounds("2026-10-25", "2026-10-25")).toEqual({
      gte: "2026-10-24T21:00:00.000Z",
      lt: "2026-10-25T22:00:00.000Z",
    });
  });

  it("crosses month and year ends; open ends are omitted", () => {
    expect(kyivDayBounds(undefined, "2026-12-31")).toEqual({ lt: "2026-12-31T22:00:00.000Z" });
    expect(kyivDayBounds()).toEqual({});
  });
});

describe("escapeLikeValue / leadSearch", () => {
  it("escapes LIKE wildcards and backslash", () => {
    expect(escapeLikeValue("50%_off\\")).toBe("50\\%\\_off\\\\");
    expect(escapeLikeValue("a,(b)")).toBe("a,(b)");
  });

  it("phone search with 3+ digits, stripping everything else", () => {
    expect(leadSearch("067 000-00")).toEqual({ column: "phone", pattern: "%06700000%" });
    expect(leadSearch("+38 (067) 1")).toEqual({ column: "phone", pattern: "%380671%" });
  });

  it("name search otherwise, escaped", () => {
    expect(leadSearch("Олена")).toEqual({ column: "name", pattern: "%Олена%" });
    expect(leadSearch("a1 b2")).toEqual({ column: "name", pattern: "%a1 b2%" });
    expect(leadSearch("100%")).toEqual({ column: "phone", pattern: "%100%" });
    expect(leadSearch("a_b")).toEqual({ column: "name", pattern: "%a\\_b%"});
  });
});
