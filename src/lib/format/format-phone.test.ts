import { describe, expect, it } from "vitest";

import { formatUaPhone, resolveUaPhone, type UaPhone } from "@/lib/format/format-phone";

const FALLBACK: UaPhone = {
  display: "+380 00 000 00 01",
  href: "tel:+380000000001",
  e164: "+380000000001",
};

describe("formatUaPhone", () => {
  it("formats an E.164 Ukrainian number", () => {
    expect(formatUaPhone("+380671234567")).toEqual({
      display: "+380 67 123 45 67",
      href: "tel:+380671234567",
      e164: "+380671234567",
    });
  });

  it("accepts spaces, dashes, brackets and a missing plus", () => {
    const expected = formatUaPhone("+380671234567");
    expect(formatUaPhone(" +380 67 123-45-67 ")).toEqual(expected);
    expect(formatUaPhone("+38 (067) 123 45 67")).toEqual(expected);
    expect(formatUaPhone("380671234567")).toEqual(expected);
  });

  it("returns null for empty or invalid values", () => {
    expect(formatUaPhone(undefined)).toBeNull();
    expect(formatUaPhone("")).toBeNull();
    expect(formatUaPhone("   ")).toBeNull();
    expect(formatUaPhone("0671234567")).toBeNull();
    expect(formatUaPhone("+48123456789")).toBeNull();
    expect(formatUaPhone("+3806712345678")).toBeNull();
    expect(formatUaPhone("+380 67 abc 45 67")).toBeNull();
  });
});

describe("resolveUaPhone", () => {
  it("uses the value when it is valid", () => {
    expect(resolveUaPhone("+380 50 000 11 22", FALLBACK).display).toBe("+380 50 000 11 22");
  });

  it("falls back when the value is empty or invalid", () => {
    expect(resolveUaPhone(undefined, FALLBACK)).toBe(FALLBACK);
    expect(resolveUaPhone("", FALLBACK)).toBe(FALLBACK);
    expect(resolveUaPhone("not a phone", FALLBACK)).toBe(FALLBACK);
  });
});
