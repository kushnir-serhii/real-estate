import { describe, expect, it } from "vitest";

import { createSlug, slugifyBase, transliterate } from "./slugify";

describe("transliterate (KMU 2010)", () => {
  it("basic letters", () => {
    expect(transliterate("квартира")).toBe("kvartyra");
    expect(transliterate("Оболонь")).toBe("obolon");
    expect(transliterate("Голосіїв")).toBe("holosiiv");
    expect(transliterate("щука")).toBe("shchuka");
    expect(transliterate("ґанок")).toBe("ganok");
  });

  it("word-initial є ї й ю я differ from inner ones", () => {
    expect(transliterate("Єнакієве")).toBe("yenakiieve");
    expect(transliterate("Їжак")).toBe("yizhak");
    expect(transliterate("Йосип")).toBe("yosyp");
    expect(transliterate("Юрій")).toBe("yurii");
    expect(transliterate("Яблуневий")).toBe("yablunevyi");
    expect(transliterate("Миколаїв")).toBe("mykolaiv");
  });

  it("зг -> zgh, apostrophes dropped", () => {
    expect(transliterate("Згорани")).toBe("zghorany");
    expect(transliterate("Зв'язок")).toBe("zviazok");
    expect(transliterate("Лук’янівка")).toBe("lukianivka");
  });
});

describe("createSlug", () => {
  it("title + suffix, seed style", () => {
    expect(createSlug("2-кімнатна квартира, Оболонь", "3f9a1c")).toBe("2-kimnatna-kvartyra-obolon-3f9a1c");
    expect(createSlug("Будинок 240 м², Козин", "abc123")).toBe("budynok-240-m-kozyn-abc123");
    expect(createSlug("Ділянка 12 сот., Ірпінь", "000000")).toBe("dilianka-12-sot-irpin-000000");
    expect(createSlug("Офіс 85 м², Печерськ", "0a0b0c")).toBe("ofis-85-m-pechersk-0a0b0c");
  });

  it("only [a-z0-9-], no doubled or edge dashes", () => {
    const slug = createSlug("  ***Квартира!!!  — центр / Київ  ", "aaaaaa");
    expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(slug).toBe("kvartyra-tsentr-kyiv-aaaaaa");
  });

  it("long titles are cut on a word boundary (~60 chars)", () => {
    const title = "Дуже велика трикімнатна квартира з панорамним видом на Дніпро та парк, Печерськ, Київ";
    const base = slugifyBase(title);
    expect(base.length).toBeLessThanOrEqual(60);
    expect(base.endsWith("-")).toBe(false);
    expect(transliterate(title).replace(/-+/g, "-")).toContain(base);
    const slug = createSlug(title, "123abc");
    expect(slug.endsWith("-123abc")).toBe(true);
    expect(slug).toMatch(/^[a-z0-9-]+$/);
  });

  it("random suffix is 6 lowercase hex chars", () => {
    const slug = createSlug("Будинок, Козин");
    expect(slug).toMatch(/^budynok-kozyn-[0-9a-f]{6}$/);
    expect(createSlug("Будинок, Козин")).not.toBe(slug);
  });

  it("title with no letters falls back to the suffix", () => {
    expect(createSlug("!!!", "abcdef")).toBe("abcdef");
  });
});
