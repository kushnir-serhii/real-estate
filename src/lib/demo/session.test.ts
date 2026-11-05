import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_SESSION_MAX_AGE_S, signDemoSession, verifyDemoSession } from "./session";

// Change the first character: the last base64url character of a 32-byte signature carries 2 padding bits, so
// changing it can decode to the same bytes (a flaky test).
const flip = (text: string): string => `${text.startsWith("A") ? "Q" : "A"}${text.slice(1)}`;

describe("demo admin session", () => {
  beforeEach(() => {
    vi.stubEnv("DEMO_SESSION_SECRET", "test-secret-with-enough-length");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("verifies what it signed", async () => {
    const now = Date.now();
    const session = await verifyDemoSession(await signDemoSession(now), now);
    expect(session).toEqual({ role: "admin", exp: Math.floor(now / 1000) + DEMO_SESSION_MAX_AGE_S });
  });

  it("expires after the max age", async () => {
    const now = Date.now();
    const token = await signDemoSession(now);
    expect(await verifyDemoSession(token, now + (DEMO_SESSION_MAX_AGE_S - 5) * 1000)).not.toBeNull();
    expect(await verifyDemoSession(token, now + (DEMO_SESSION_MAX_AGE_S + 1) * 1000)).toBeNull();
  });

  it("rejects a tampered signature", async () => {
    const [payload, signature] = (await signDemoSession()).split(".");
    expect(await verifyDemoSession(`${payload}.${flip(signature)}`)).toBeNull();
  });

  it("rejects a tampered payload (an extended expiry keeps the old signature)", async () => {
    const [payload, signature] = (await signDemoSession()).split(".");
    const forged = btoa(JSON.stringify({ role: "admin", exp: 9_999_999_999 })).replace(/=+$/, "");
    expect(await verifyDemoSession(`${forged}.${signature}`)).toBeNull();
    expect(await verifyDemoSession(`${flip(payload)}.${signature}`)).toBeNull();
  });

  it("rejects a token signed with another secret", async () => {
    const token = await signDemoSession();
    vi.stubEnv("DEMO_SESSION_SECRET", "another-secret-entirely-different");
    expect(await verifyDemoSession(token)).toBeNull();
  });

  it("rejects garbage without throwing", async () => {
    for (const token of [undefined, null, "", "abc", "a.b.c", ".", "!!!.???", "e30.e30"]) {
      expect(await verifyDemoSession(token)).toBeNull();
    }
  });

  it("falls back to the fixed dev secret (with at most one warning) when the secret is empty", async () => {
    vi.stubEnv("DEMO_SESSION_SECRET", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const token = await signDemoSession();
    expect(await verifyDemoSession(token)).not.toBeNull();
    expect(warn.mock.calls.length).toBeLessThanOrEqual(1);
    warn.mockRestore();
  });
});
