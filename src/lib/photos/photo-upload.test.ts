import { describe, expect, it } from "vitest";
import { hasImageMagic, parseWidthField, photoKey, pickMainWidth, randomToken } from "./photo-upload";

describe("parseWidthField", () => {
  it("accepts w1..w1600", () => {
    expect(parseWidthField("w480")).toBe(480);
    expect(parseWidthField("w1200")).toBe(1200);
    expect(parseWidthField("w1")).toBe(1);
  });
  it("refuses others", () => {
    for (const name of ["w0", "w1601", "w", "480", "w-5", "w12.5", "W480", "w00480", "file"]) {
      expect(parseWidthField(name)).toBeNull();
    }
  });
});

describe("pickMainWidth", () => {
  it("prefers 960, then the largest below, then the smallest", () => {
    expect(pickMainWidth([480, 960, 1600])).toBe(960);
    expect(pickMainWidth([480, 700])).toBe(700);
    expect(pickMainWidth([1200])).toBe(1200);
    expect(pickMainWidth([1200, 1600])).toBe(1200);
    expect(pickMainWidth([])).toBeNull();
  });
});

describe("hasImageMagic", () => {
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]);
  it("recognises webp and jpeg", () => {
    expect(hasImageMagic(webp, "webp")).toBe(true);
    expect(hasImageMagic(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), "jpg")).toBe(true);
  });
  it("rejects mismatches", () => {
    expect(hasImageMagic(webp, "jpg")).toBe(false);
    expect(hasImageMagic(new Uint8Array([0xff, 0xd8, 0xff]), "webp")).toBe(false);
    expect(hasImageMagic(new TextEncoder().encode("<html></html>"), "webp")).toBe(false);
  });
});

describe("keys", () => {
  it("builds the 003 layout", () => {
    expect(photoKey("p", "abcdef0123", 960, "jpg")).toBe("properties/p/abcdef0123-960.jpg");
    expect(randomToken()).toMatch(/^[0-9a-f]{10}$/);
  });
});
