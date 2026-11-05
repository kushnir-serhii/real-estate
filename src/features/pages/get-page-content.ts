import "server-only";

import { getPage } from "@/lib/db/pages";
import { hasPublicData } from "@/lib/data-driver";
import { DEFAULT_PAGES } from "@/constants/pages";
import type { PageContent, PageSlug } from "@/constants/pages";

/** Page content from `pages`, or the built-in default. Never throws. */
export const getPageContent = async (slug: PageSlug): Promise<PageContent> => {
  if (!hasPublicData()) return DEFAULT_PAGES[slug];
  try {
    const page = await getPage(slug);
    return page ?? DEFAULT_PAGES[slug];
  } catch {
    return DEFAULT_PAGES[slug];
  }
};
