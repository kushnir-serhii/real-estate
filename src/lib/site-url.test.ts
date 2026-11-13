import { describe, expect, it } from "vitest";

import { getSiteUrl } from "./site-url";

const PROD_SUPABASE = { NODE_ENV: "production", NEXT_PHASE: "phase-production-build", DATA_DRIVER: "supabase" };

describe("getSiteUrl", () => {
  it("returns the configured origin without a path", () => {
    expect(getSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://diplomathall.example/" })).toBe("https://diplomathall.example");
  });

  it("falls back to localhost outside a production build", () => {
    expect(getSiteUrl({ NODE_ENV: "development" })).toBe("http://localhost:3000");
    expect(getSiteUrl({ NODE_ENV: "production" })).toBe("http://localhost:3000");
  });

  it("demo driver: a production build without the variable falls back to localhost", () => {
    expect(getSiteUrl({ NODE_ENV: "production", NEXT_PHASE: "phase-production-build" })).toBe("http://localhost:3000");
    expect(getSiteUrl({ NODE_ENV: "production", NEXT_PHASE: "phase-production-build", DATA_DRIVER: "demo" })).toBe(
      "http://localhost:3000",
    );
  });

  it("supabase driver: throws with a clear message in a production build without the variable", () => {
    expect(() => getSiteUrl({ ...PROD_SUPABASE })).toThrow(
      /NEXT_PUBLIC_SITE_URL is empty/,
    );
  });

  it("throws on an invalid value in a production build", () => {
    expect(() =>
      getSiteUrl({ ...PROD_SUPABASE, NEXT_PUBLIC_SITE_URL: "nope" }),
    ).toThrow(/not a valid URL/);
  });

  it("can be opted out for local builds", () => {
    expect(
      getSiteUrl({ ...PROD_SUPABASE, SEO_ALLOW_LOCALHOST: "1" }),
    ).toBe("http://localhost:3000");
  });
});
