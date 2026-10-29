import { describe, expect, it } from "vitest";

import { getSiteUrl } from "./site-url";

describe("getSiteUrl", () => {
  it("returns the configured origin without a path", () => {
    expect(getSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://sofiacity.example/" })).toBe("https://sofiacity.example");
  });

  it("falls back to localhost outside a production build", () => {
    expect(getSiteUrl({ NODE_ENV: "development" })).toBe("http://localhost:3000");
    expect(getSiteUrl({ NODE_ENV: "production" })).toBe("http://localhost:3000");
  });

  it("throws with a clear message in a production build without the variable", () => {
    expect(() => getSiteUrl({ NODE_ENV: "production", NEXT_PHASE: "phase-production-build" })).toThrow(
      /NEXT_PUBLIC_SITE_URL is empty/,
    );
  });

  it("throws on an invalid value in a production build", () => {
    expect(() =>
      getSiteUrl({ NODE_ENV: "production", NEXT_PHASE: "phase-production-build", NEXT_PUBLIC_SITE_URL: "nope" }),
    ).toThrow(/not a valid URL/);
  });

  it("can be opted out for local builds", () => {
    expect(
      getSiteUrl({ NODE_ENV: "production", NEXT_PHASE: "phase-production-build", SEO_ALLOW_LOCALHOST: "1" }),
    ).toBe("http://localhost:3000");
  });
});
