import type { Database } from "@/lib/supabase/database.types";
import { buildDemoSeed } from "./seed";

type Tables = Database["public"]["Tables"];

/**
 * Full rows of every table, typed from the generated Database types (a migration that changes a column
 * breaks the seed at compile time). Public read functions must filter like RLS does; see `src/lib/demo/db/`.
 */
export type DemoData = {
  properties: Tables["properties"]["Row"][];
  property_photos: Tables["property_photos"]["Row"][];
  agents: Tables["agents"]["Row"][];
  pages: Tables["pages"]["Row"][];
  posts: Tables["posts"]["Row"][];
  post_properties: Tables["post_properties"]["Row"][];
  settings: Tables["settings"]["Row"];
  leads: Tables["leads"]["Row"][];
  ai_conversations: Tables["ai_conversations"]["Row"][];
  ai_messages: Tables["ai_messages"]["Row"][];
  ai_usage: Tables["ai_usage"]["Row"][];
  admins: Tables["admins"]["Row"][];
};

const STORE_KEY = "__demoStore";

type StoreGlobal = typeof globalThis & { [STORE_KEY]?: DemoData };

/**
 * The in-memory demo store: one per process (per isolate on Workers), seeded on first use and kept on
 * `globalThis` so it survives HMR. Read lazily, never at import time.
 */
export const getDemoStore = (): DemoData => {
  const holder: StoreGlobal = globalThis;
  holder[STORE_KEY] ??= buildDemoSeed(Date.now());
  return holder[STORE_KEY];
};

/** Throws the store away and seeds it again (the admin «reset demo data» button, tests). */
export const resetDemoStore = (): DemoData => {
  const holder: StoreGlobal = globalThis;
  holder[STORE_KEY] = buildDemoSeed(Date.now());
  return holder[STORE_KEY];
};
