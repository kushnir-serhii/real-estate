import { describe, expect, it } from "vitest";
import { createSyncCursor, formatKyivMinute } from "./sync-cursor";

describe("sync cursor", () => {
  it("formats Kyiv winter time (UTC+2)", () => {
    expect(formatKyivMinute(new Date("2026-01-15T10:05:30Z"))).toBe("2026-01-15 12:05");
  });

  it("formats Kyiv summer time (UTC+3)", () => {
    expect(formatKyivMinute(new Date("2026-07-15T10:05:30Z"))).toBe("2026-07-15 13:05");
  });

  it("rolls over midnight", () => {
    expect(formatKyivMinute(new Date("2026-07-15T21:30:00Z"))).toBe("2026-07-16 00:30");
  });

  it("subtracts 10 minutes of overlap", () => {
    expect(createSyncCursor(new Date("2026-10-28T09:05:00Z"))).toBe("2026-10-28 10:55");
  });
});
