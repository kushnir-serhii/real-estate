import { describe, expect, it } from "vitest";

import { readLeadWishes } from "./read-lead-wishes";
import { readLeadUtm } from "./read-lead-utm";

describe("readLeadWishes", () => {
  it("reads deal, type and similar_to", () => {
    expect(
      readLeadWishes({ deal: "rent", property_type: "flat", similar_to: { id: "x", slug: "a-b", title: "Квартира" } }),
    ).toEqual({ deal: "rent", propertyType: "flat", similarTo: { slug: "a-b", title: "Квартира" } });
  });

  it("drops only the malformed key and ignores unknown ones", () => {
    expect(readLeadWishes({ deal: "swap", property_type: "house", budget: 100, similar_to: "x" })).toEqual({
      propertyType: "house",
    });
  });

  it("treats null and non-objects as no wishes", () => {
    expect(readLeadWishes(null)).toEqual({});
    expect(readLeadWishes([1, 2])).toEqual({});
    expect(readLeadWishes("buy")).toEqual({});
  });
});

describe("readLeadUtm", () => {
  it("keeps non-empty string values only", () => {
    expect(readLeadUtm({ utm_source: "google", utm_medium: "", utm_term: 5 })).toEqual([["utm_source", "google"]]);
  });

  it("returns nothing for null or arrays", () => {
    expect(readLeadUtm(null)).toEqual([]);
    expect(readLeadUtm(["a"])).toEqual([]);
  });
});
