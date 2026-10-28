import "server-only";

import { getPage } from "@/lib/db/pages";
import { getSupabasePublicEnvOrNull } from "@/lib/supabase/env";
import { DEFAULT_PAGES } from "./default-pages";
import type { PageContent, PageSlug } from "./default-pages";

/** Page content from `pages`, or the built-in default. Never throws. */
export const getPageContent = async (slug: PageSlug): Promise<PageContent> => {
  if (getSupabasePublicEnvOrNull() === null) return DEFAULT_PAGES[slug];
  try {
    const page = await getPage(slug);
    return page ?? DEFAULT_PAGES[slug];
  } catch {
    return DEFAULT_PAGES[slug];
  }
};
