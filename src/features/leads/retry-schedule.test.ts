import { describe, expect, it } from "vitest";

import { MAX_DELIVERY_ATTEMPTS, nextAttemptAt } from "./retry-schedule";

const now = new Date("2026-10-28T12:00:00.000Z");
const minutesAfter = (date: Date | null) => (date ? (date.getTime() - now.getTime()) / 60_000 : null);

describe("nextAttemptAt", () => {
  it("waits 5 min, 15 min, 1 h, 3 h after failed attempts 1..4", () => {
    expect([1, 2, 3, 4].map((n) => minutesAfter(nextAttemptAt(n, now)))).toEqual([5, 15, 60, 180]);
  });

  it("gives no next attempt after the last one", () => {
    expect(MAX_DELIVERY_ATTEMPTS).toBe(5);
    expect(nextAttemptAt(5, now)).toBeNull();
    expect(nextAttemptAt(9, now)).toBeNull();
  });

  it("gives none for a nonsensical count", () => {
    expect(nextAttemptAt(0, now)).toBeNull();
  });
});
