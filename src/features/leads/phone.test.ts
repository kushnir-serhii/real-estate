import { describe, expect, it } from "vitest";

import { formatPhoneInput, normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it.each([
    ["+380671234567", "+380671234567"],
    ["380671234567", "+380671234567"],
    ["0671234567", "+380671234567"],
    ["+38 (067) 123-45-67", "+380671234567"],
    ["067 123 45 67", "+380671234567"],
    ["+44 20 7946 0958", "+442079460958"],
    ["+1 (415) 555-2671", "+14155552671"],
  ])("accepts %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each([
    "",
    "abc",
    "067123456",
    "+38067123456",
    "+3806712345678",
    "0671234567890",
    "12345",
    "+123456789",
    "+1234567890123456",
    "44 20 7946 0958",
    "06+71234567",
    "+380671234567x",
  ])("rejects %s", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});

describe("formatPhoneInput", () => {
  it.each([
    ["", ""],
    ["+", "+"],
    ["3", "+3"],
    ["+38", "+38"],
    ["+380", "+380"],
    ["0", "+380"],
    ["067", "+380 67"],
    ["0671234567", "+380 67 123 45 67"],
    ["+380671234567", "+380 67 123 45 67"],
    ["380671", "+380 67 1"],
    ["+380671234567890", "+380 67 123 45 67"],
    ["+44 20 7946 0958", "+442079460958"],
  ])("formats %s as %s", (input, expected) => {
    expect(formatPhoneInput(input)).toBe(expected);
  });

  it("is stable when applied to its own output", () => {
    const once = formatPhoneInput("0671234567");
    expect(formatPhoneInput(once)).toBe(once);
  });
});
