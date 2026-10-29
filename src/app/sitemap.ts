import type { MetadataRoute } from "next";

import { PAGE_SLUGS } from "@/constants/pages";
import type { PageSlug } from "@/constants/pages";
import { getPageContent } from "@/features/pages/get-page-content";
import { buildSitemapEntries } from "@/features/seo/sitemap-entries";
import { getSitemapProperties } from "@/lib/db/properties";
import type { SitemapProperty } from "@/lib/db/properties";
import { getSiteUrl } from "@/lib/site-url";
import { getSupabasePublicEnvOrNull } from "@/lib/supabase/env";

// Refreshed by the `properties` / `pages` cache tags; also at most hourly.
export const revalidate = 3600;

const loadProperties = async (): Promise<SitemapProperty[]> => {
  if (getSupabasePublicEnvOrNull() === null) return [];
  try {
    return await getSitemapProperties();
  } catch (error) {
    // The sitemap must never fail: serve the static entries and try again on the next revalidation.
    console.warn("sitemap: properties unavailable.", error instanceof Error ? error.message : error);
    return [];
  }
};

const loadIndexablePages = async (): Promise<PageSlug[]> => {
  const pages = await Promise.all(PAGE_SLUGS.map(async (slug) => ({ slug, page: await getPageContent(slug) })));
  return pages.filter(({ page }) => !page.noindex).map(({ slug }) => slug);
};

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const [properties, indexablePages] = await Promise.all([loadProperties(), loadIndexablePages()]);
  return buildSitemapEntries({ siteUrl: getSiteUrl(), properties, indexablePages });
};

export default sitemap;
