import "server-only";
import { unstable_cache } from "next/cache";
import { getCacheScope, isDemoMode } from "@/lib/data-driver";
import type { Database } from "@/lib/supabase/database.types";
import { CACHE_TAGS, pageTag } from "./cache-tags";
import type { PagesDriver } from "./driver-types";

export type Page = Database["public"]["Tables"]["pages"]["Row"];

const loadDriver = async (): Promise<PagesDriver> =>
  isDemoMode()
    ? (await import("@/lib/demo/db/pages")).demoPagesDriver
    : (await import("@/lib/db/supabase/pages")).supabasePagesDriver;

/** A static page by slug, or null. Cached under `pages` and `page:<slug>`. */
export const getPage = (slug: string): Promise<Page | null> =>
  unstable_cache(
    async (s: string) => (await loadDriver()).fetchPage(s),
    ["page-by-slug", getCacheScope(), slug],
    { tags: [CACHE_TAGS.pages, pageTag(slug)] },
  )(slug);
