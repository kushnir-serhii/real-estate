import { describe, expect, it } from "vitest";
import { derivePrice, nextSlug, planGeocode, sameAddress, type AddressState } from "./property-derive";

const RATES = { UAH: 40, EUR: 0.9 };

describe("derivePrice", () => {
  it("USD: price_usd equals the amount; per m2 from the total area", () => {
    expect(derivePrice({ price_amount: 100_000, currency: "USD", area_total: 64 }, RATES)).toEqual({
      price_amount: 100_000,
      currency: "USD",
      price_usd: 100_000,
      price_per_m2: 1563,
    });
  });

  it("UAH and EUR convert with the rates and round", () => {
    expect(derivePrice({ price_amount: 4_000_001, currency: "UAH", area_total: null }, RATES).price_usd).toBe(100_000);
    expect(derivePrice({ price_amount: 90_000, currency: "EUR", area_total: null }, RATES).price_usd).toBe(100_000);
  });

  it("no area (or zero) -> no price per m2", () => {
    expect(derivePrice({ price_amount: 10, currency: "USD", area_total: null }, RATES).price_per_m2).toBeNull();
    expect(derivePrice({ price_amount: 10, currency: "USD", area_total: 0 }, RATES).price_per_m2).toBeNull();
  });

  it("no price or no currency clears every price column", () => {
    const none = { price_amount: null, currency: null, price_usd: null, price_per_m2: null };
    expect(derivePrice({ price_amount: null, currency: "USD", area_total: 50 }, RATES)).toEqual(none);
    expect(derivePrice({ price_amount: 5, currency: null, area_total: 50 }, RATES)).toEqual(none);
  });

  it("a zero price is still a price", () => {
    expect(derivePrice({ price_amount: 0, currency: "USD", area_total: 50 }, RATES)).toMatchObject({
      price_usd: 0,
      price_per_m2: 0,
    });
  });
});

describe("nextSlug", () => {
  it("regenerates from the new title while unpublished", () => {
    expect(nextSlug({ title: "Стара", published_at: null }, "Нова назва", "abc123")).toBe("nova-nazva-abc123");
  });

  it("keeps the slug when the title did not change", () => {
    expect(nextSlug({ title: "Та сама", published_at: null }, "Та сама", "abc123")).toBeNull();
  });

  it("never changes once published", () => {
    expect(nextSlug({ title: "Стара", published_at: "2026-10-01T00:00:00Z" }, "Нова", "abc123")).toBeNull();
  });
});

const address = (patch: Partial<AddressState> = {}): AddressState => ({
  locality: "Київ",
  district: null,
  street: "Хрещатик",
  house: "1",
  lat: 50.4,
  lng: 30.5,
  ...patch,
});

describe("planGeocode", () => {
  it("skips when the address is the same and coordinates exist", () => {
    expect(planGeocode(address(), address())).toEqual({ kind: "skip" });
  });

  it("ignores case and spaces when comparing addresses", () => {
    expect(sameAddress(address({ street: " хрещатик " }), address())).toBe(true);
  });

  it("looks up when the address changed or coordinates are empty", () => {
    expect(planGeocode(address({ house: "2" }), address())).toEqual({ kind: "lookup" });
    expect(planGeocode(address(), address({ lat: null, lng: null }))).toEqual({ kind: "lookup" });
    expect(planGeocode(address(), null)).toEqual({ kind: "lookup" });
  });

  it("without a locality: clears old coordinates, else skips", () => {
    expect(planGeocode(address({ locality: null }), address())).toEqual({ kind: "clear" });
    expect(planGeocode(address({ locality: null }), address({ lat: null, lng: null, locality: null }))).toEqual({
      kind: "skip",
    });
    expect(planGeocode(address({ locality: null }), null)).toEqual({ kind: "skip" });
  });
});
