import { describe, expect, it } from "vitest";

import { formatShortDate } from "@/lib/format/format-short-date";

const NOW = new Date("2026-11-18T10:00:00Z");

describe("formatShortDate", () => {
  it("shows day and short month in the current year", () => {
    expect(formatShortDate("2026-11-16T09:00:00Z", NOW)).toBe("16 лист.");
  });

  it("uses Kyiv time, not UTC", () => {
    // 22:30 UTC on 15 Nov is already 16 Nov in Kyiv
    expect(formatShortDate("2026-11-15T22:30:00Z", NOW)).toBe("16 лист.");
  });

  it("adds the year for an earlier year", () => {
    expect(formatShortDate("2025-04-09T09:00:00Z", NOW)).toMatch(/^9 квіт\. 2025/);
  });

  it("returns null for a missing or bad date", () => {
    expect(formatShortDate(null, NOW)).toBeNull();
    expect(formatShortDate("nope", NOW)).toBeNull();
  });
});
