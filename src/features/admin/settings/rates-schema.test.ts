import { describe, expect, it } from "vitest";
import { parseRateInput, ratesFormSchema } from "./rates-schema";

describe("parseRateInput", () => {
  it("accepts dot and comma decimals", () => {
    expect(parseRateInput("41.5")).toBe(41.5);
    expect(parseRateInput(" 41,5 ")).toBe(41.5);
  });
  it("rejects junk", () => {
    for (const v of ["", "abc", "1e3", "4 1", "-3", null]) expect(parseRateInput(v)).toBeNaN();
  });
});

describe("ratesFormSchema", () => {
  it("accepts sane rates", () => {
    expect(ratesFormSchema.safeParse({ UAH: 41.5, EUR: 0.92 }).success).toBe(true);
  });
  it("rejects out-of-bounds and NaN with per-field messages", () => {
    const r = ratesFormSchema.safeParse({ UAH: 0, EUR: Number.NaN });
    expect(r.success).toBe(false);
    if (!r.success) {
      const fields = r.error.issues.map((i) => i.path[0]);
      expect(fields).toContain("UAH");
      expect(fields).toContain("EUR");
    }
    expect(ratesFormSchema.safeParse({ UAH: 5000, EUR: 0.9 }).success).toBe(false);
  });
});
