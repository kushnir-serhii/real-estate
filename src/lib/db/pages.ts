import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { Database } from "@/lib/supabase/database.types";
import { CACHE_TAGS, pageTag } from "./cache-tags";

export type Page = Database["public"]["Tables"]["pages"]["Row"];

const fetchPage = async (slug: string): Promise<Page | null> => {
  const { data, error } = await createPublicClient()
    .from("pages")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`getPage failed: ${error.message}`);
  return data;
};

/** A static page by slug, or null. Cached under `pages` and `page:<slug>`. */
export const getPage = (slug: string): Promise<Page | null> =>
  unstable_cache(fetchPage, ["page-by-slug", slug], {
    tags: [CACHE_TAGS.pages, pageTag(slug)],
  })(slug);
