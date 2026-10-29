import { describe, expect, it } from "vitest";
import { canCreateProperty, canEditProperty } from "./property-permissions";

describe("canCreateProperty", () => {
  it("allows create only in admin mode", () => {
    expect(canCreateProperty("admin")).toBe(true);
    expect(canCreateProperty("plektan")).toBe(false);
  });
});

describe("canEditProperty", () => {
  it("admin mode: everything, for both sources", () => {
    for (const source of ["admin", "plektan"] as const) {
      expect(canEditProperty("admin", source)).toEqual({ fields: "all", publish: true, photos: true });
    }
  });

  it("plektan mode: SEO only, no photos; publish only for admin-source rows", () => {
    expect(canEditProperty("plektan", "plektan")).toEqual({ fields: "seo", publish: false, photos: false });
    expect(canEditProperty("plektan", "admin")).toEqual({ fields: "seo", publish: true, photos: false });
  });
});
