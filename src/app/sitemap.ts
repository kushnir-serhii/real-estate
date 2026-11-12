import type { MetadataRoute } from "next";

import { PAGE_SLUGS } from "@/constants/pages";
import type { PageSlug } from "@/constants/pages";
import { getPageContent } from "@/features/pages/get-page-content";
import { buildSitemapEntries } from "@/features/seo/sitemap-entries";
import { getSitemapPosts } from "@/lib/db/posts";
import type { SitemapPost } from "@/lib/db/posts";
import { getSitemapProperties } from "@/lib/db/properties";
import type { SitemapProperty } from "@/lib/db/properties";
import { getSiteUrl } from "@/lib/site-url";
import { hasPublicData } from "@/lib/data-driver";

// Refreshed by the `properties` / `posts` / `pages` cache tags; also at most hourly.
export const revalidate = 3600;

const loadProperties = async (): Promise<SitemapProperty[]> => {
  if (!hasPublicData()) return [];
  try {
    return await getSitemapProperties();
  } catch (error) {
    // The sitemap must never fail: serve the static entries and try again on the next revalidation.
    console.warn("sitemap: properties unavailable.", error instanceof Error ? error.message : error);
    return [];
  }
};

const loadPosts = async (): Promise<SitemapPost[]> => {
  if (!hasPublicData()) return [];
  try {
    return await getSitemapPosts();
  } catch (error) {
    console.warn("sitemap: posts unavailable.", error instanceof Error ? error.message : error);
    return [];
  }
};

const loadIndexablePages = async (): Promise<PageSlug[]> => {
  const pages = await Promise.all(PAGE_SLUGS.map(async (slug) => ({ slug, page: await getPageContent(slug) })));
  return pages.filter(({ page }) => !page.noindex).map(({ slug }) => slug);
};

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const [properties, posts, indexablePages] = await Promise.all([loadProperties(), loadPosts(), loadIndexablePages()]);
  return buildSitemapEntries({ siteUrl: getSiteUrl(), properties, posts, indexablePages });
};

export default sitemap;
