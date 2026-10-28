import { describe, expect, it, vi } from "vitest";

import { createGeocoder, isGeocodeError, roundCoordinate } from "@/lib/geocode";

const address = { locality: "Київ", district: "Оболонь", street: "проспект Оболонський", house: "26" };

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const keyed = (fetchMock: typeof fetch) =>
  createGeocoder({ contactEmail: "geo@example.test", fetch: fetchMock, minGapMs: 0, retryDelayMs: 0 });

describe("fixture mode", () => {
  const fixture = createGeocoder({ contactEmail: "" });

  it("is deterministic and rounded to 3 decimals", async () => {
    const a = await fixture.geocode(address);
    const b = await fixture.geocode(address);
    expect(a).toEqual(b);
    expect(a).not.toBeNull();
    expect(a?.precision).toBe("house");
    expect(roundCoordinate(a?.lat ?? 0)).toBe(a?.lat);
    expect(roundCoordinate(a?.lng ?? 0)).toBe(a?.lng);
    expect(Math.abs((a?.lat ?? 0) - 50.5)).toBeLessThan(0.02);
  });

  it("falls back to coarser precision and returns null for an unknown locality", async () => {
    expect((await fixture.geocode({ ...address, house: null }))?.precision).toBe("street");
    expect((await fixture.geocode({ ...address, house: null, street: null }))?.precision).toBe("district");
    expect((await fixture.geocode({ locality: "Козин", district: null, street: null, house: null }))?.precision).toBe("locality");
    expect(await fixture.geocode({ locality: "Невідоме село", district: null, street: "вулиця", house: "1" })).toBeNull();
    expect(await fixture.geocode({ locality: null, district: null, street: null, house: null })).toBeNull();
  });
});

describe("Nominatim", () => {
  it("sends the policy parameters and rounds string coordinates", async () => {
    const fetchMock = vi.fn(async () => json([{ lat: "50.500456", lon: "30.498512" }]));
    const result = await keyed(fetchMock as unknown as typeof fetch).geocode(address);
    expect(result).toEqual({ lat: 50.5, lng: 30.499, precision: "house" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const params = new URL(url).searchParams;
    expect(params.get("countrycodes")).toBe("ua");
    expect(params.get("accept-language")).toBe("uk");
    expect(params.get("format")).toBe("jsonv2");
    expect(params.get("limit")).toBe("1");
    expect(params.get("email")).toBe("geo@example.test");
    expect((init.headers as Record<string, string>)["User-Agent"]).toContain("geo@example.test");
  });

  it("falls back house -> street -> district -> locality and stops at the first hit", async () => {
    const queries: string[] = [];
    const fetchMock = vi.fn(async (url: string) => {
      const q = new URL(url).searchParams.get("q") ?? "";
      queries.push(q);
      return json(q === "Київ" ? [{ lat: "50.45", lon: "30.52" }] : []);
    });
    const result = await keyed(fetchMock as unknown as typeof fetch).geocode(address);
    expect(result?.precision).toBe("locality");
    expect(queries).toHaveLength(4);
  });

  it("returns null when nothing is found at any level", async () => {
    const fetchMock = vi.fn(async () => json([]));
    expect(await keyed(fetchMock as unknown as typeof fetch).geocode(address)).toBeNull();
  });

  it("retries once on a 5xx, then throws a typed error", async () => {
    const fetchMock = vi.fn(async () => json({}, 503));
    const error = await keyed(fetchMock as unknown as typeof fetch).geocode(address).catch((caught: unknown) => caught);
    expect(isGeocodeError(error) && error.kind).toBe("http");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("stops for the rest of the run after a 429, until reset", async () => {
    const fetchMock = vi.fn(async () => json({}, 429));
    const geocoder = keyed(fetchMock as unknown as typeof fetch);
    await expect(geocoder.geocode(address)).rejects.toMatchObject({ kind: "rate_limited" });
    await expect(geocoder.geocode(address)).rejects.toMatchObject({ kind: "rate_limited" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    geocoder.reset();
    await expect(geocoder.geocode(address)).rejects.toMatchObject({ kind: "rate_limited" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects an unexpected response shape", async () => {
    const fetchMock = vi.fn(async () => json([{ lat: 50.4, lon: 30.5 }]));
    await expect(keyed(fetchMock as unknown as typeof fetch).geocode(address)).rejects.toMatchObject({ kind: "invalid_response" });
  });

  it("keeps at least the minimum gap between requests", async () => {
    const times: number[] = [];
    const fetchMock = vi.fn(async () => {
      times.push(Date.now());
      return json([]);
    });
    const geocoder = createGeocoder({ contactEmail: "geo@example.test", fetch: fetchMock as unknown as typeof fetch, minGapMs: 60 });
    await geocoder.geocode({ locality: "Київ", district: null, street: null, house: null });
    await geocoder.geocode({ locality: "Київ", district: null, street: null, house: null });
    expect((times[1] ?? 0) - (times[0] ?? 0)).toBeGreaterThanOrEqual(55);
  });
});
