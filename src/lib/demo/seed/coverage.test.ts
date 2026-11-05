import { describe, expect, it } from "vitest";

import { DISTRICTS } from "@/constants/home";
import { SIMILAR_LIMIT, SIMILAR_PRICE_RANGE } from "@/lib/db/property-query";
import { DEALS } from "@/lib/db/property-values";
import { buildDemoSeed } from "./index";
import { SEED_PHOTO_FILES } from "./photos";

const seed = buildDemoSeed(Date.parse("2026-11-05T12:00:00Z"));
const published = seed.properties.filter((p) => p.status === "published");

/** Same rule as `fetchSimilarProperties` in the demo driver: same deal + type, price_usd within ±30%, not itself, at most SIMILAR_LIMIT. */
const similarCount = (target: (typeof published)[number]): number => {
  const price = target.price_usd;
  const low = price === null ? null : Math.floor(price * (1 - SIMILAR_PRICE_RANGE));
  const high = price === null ? null : Math.ceil(price * (1 + SIMILAR_PRICE_RANGE));
  return Math.min(
    SIMILAR_LIMIT,
    published.filter(
      (p) =>
        p.deal === target.deal &&
        p.property_type === target.property_type &&
        p.id !== target.id &&
        (low === null || high === null || (p.price_usd !== null && p.price_usd >= low && p.price_usd <= high)),
    ).length,
  );
};

describe("demo seed coverage (no empty-looking pages)", () => {
  it("every district tile on the home page has at least 3 published listings", () => {
    for (const district of DISTRICTS.items) {
      const count = published.filter((p) => p.district === district.name).length;
      expect(count, district.name).toBeGreaterThanOrEqual(3);
    }
  });

  it("every deal has at least 4 published listings", () => {
    for (const deal of DEALS) {
      expect(published.filter((p) => p.deal === deal).length, deal).toBeGreaterThanOrEqual(4);
    }
  });

  it("every published listing has at least 3 similar ones", () => {
    const short = published.filter((p) => similarCount(p) < 3).map((p) => `${p.slug} (${p.deal}, ${p.property_type}, ${p.price_usd} USD)`);
    expect(short).toEqual([]);
  });

  it("has four active agents plus an inactive one", () => {
    expect(seed.agents.filter((a) => a.is_active)).toHaveLength(4);
    expect(seed.agents.filter((a) => !a.is_active)).toHaveLength(1);
  });

  it("only uses existing placeholder files and unique slugs", () => {
    const slugs = seed.properties.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const photo of seed.property_photos) {
      const file = photo.r2_key.replace(/^placeholders\//, "").replace(/\.webp$/, "");
      expect(Object.keys(SEED_PHOTO_FILES), photo.r2_key).toContain(file);
    }
  });
});
