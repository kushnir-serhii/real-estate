import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { generateSeedSql } from "./sql";

const normalize = (text: string): string => text.replaceAll("\r\n", "\n");

describe("supabase/seed.sql", () => {
  it("matches the generator output (run `pnpm seed:sql` after changing src/lib/demo/seed)", () => {
    const committed = readFileSync(path.join(process.cwd(), "supabase", "seed.sql"), "utf8");
    expect(normalize(committed)).toBe(generateSeedSql());
  });

  it("is deterministic and relative to now()", () => {
    const sql = generateSeedSql();
    expect(generateSeedSql()).toBe(sql);
    expect(sql).toMatch(/now\(\) - interval '3 days'/);
    expect(sql).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:/);
  });

  it("fills every seeded table in foreign-key order", () => {
    const sql = generateSeedSql();
    const order = ["agents", "properties", "property_photos", "pages", "posts", "post_properties", "auth.users", "admins", "leads", "ai_conversations", "ai_messages"].map(
      (table) => sql.indexOf(`insert into ${table.includes(".") ? table : `public.${table}`} `),
    );
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});
