import { describe, expect, it } from "vitest";
import { POST_SLUG_MAX, slugifyTitle } from "./post-slug";

describe("slugifyTitle", () => {
  it("transliterates Ukrainian", () => {
    expect(slugifyTitle("Які документи перевірити перед купівлею квартири")).toBe(
      "yaki-dokumenty-pereviryty-pered-kupivleiu-kvartyry",
    );
  });

  it("drops punctuation and collapses separators", () => {
    expect(slugifyTitle("  Ринок: осінь 2026 — що далі?  ")).toBe("rynok-osin-2026-shcho-dali");
  });

  it("handles apostrophes and ukrainian-specific letters", () => {
    expect(slugifyTitle("Пам'ятка орендарю")).toBe("pamiatka-orendariu");
    expect(slugifyTitle("Єдина ґанок")).toBe("yedyna-ganok");
  });

  it("is empty when nothing usable is left", () => {
    expect(slugifyTitle("!!! ???")).toBe("");
  });

  it("cuts long titles on a word boundary", () => {
    const slug = slugifyTitle("дуже ".repeat(40));
    expect(slug.length).toBeLessThanOrEqual(POST_SLUG_MAX);
    expect(slug.endsWith("-")).toBe(false);
  });
});
