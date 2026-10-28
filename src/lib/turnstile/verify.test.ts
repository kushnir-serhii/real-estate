import { describe, expect, it, vi } from "vitest";

import { verifyTurnstileWith } from "./verify";

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("verifyTurnstileWith", () => {
  it("passes in fixture mode without calling the network", async () => {
    const fetchMock = vi.fn();
    expect(await verifyTurnstileWith({ secret: "", fetch: fetchMock }, "")).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts a good token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
    expect(await verifyTurnstileWith({ secret: "s", fetch: fetchMock }, "t", "1.2.3.4")).toBe(true);
  });

  it("rejects a bad token, an empty token, HTTP errors and odd answers", async () => {
    expect(await verifyTurnstileWith({ secret: "s", fetch: async () => jsonResponse({ success: false }) }, "t")).toBe(false);
    expect(await verifyTurnstileWith({ secret: "s", fetch: vi.fn() }, " ")).toBe(false);
    expect(await verifyTurnstileWith({ secret: "s", fetch: async () => jsonResponse({}, 500) }, "t")).toBe(false);
    expect(await verifyTurnstileWith({ secret: "s", fetch: async () => jsonResponse({ nope: 1 }) }, "t")).toBe(false);
  });

  it("returns false on a network error", async () => {
    const failing = async (): Promise<Response> => {
      throw new Error("down");
    };
    expect(await verifyTurnstileWith({ secret: "s", fetch: failing }, "t")).toBe(false);
  });
});
