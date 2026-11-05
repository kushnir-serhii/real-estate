/**
 * Writes `supabase/seed.sql` from the demo seed (`src/lib/demo/seed/`). `pnpm seed:sql`.
 * A vitest test (`src/lib/demo/seed/sql.test.ts`) fails when the committed file differs from this output.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { generateSeedSql } from "@/lib/demo/seed/sql";

const target = path.join(process.cwd(), "supabase", "seed.sql");
const sql = generateSeedSql();
writeFileSync(target, sql, "utf8");
console.log(`wrote ${path.relative(process.cwd(), target)} (${sql.split("\n").length - 1} lines)`);
