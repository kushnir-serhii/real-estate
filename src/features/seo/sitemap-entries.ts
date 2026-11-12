import { DEALS } from "@/lib/db/property-values";
import { canonicalPath, isIndexable, parseCatalogState } from "@/features/catalog/catalog-params";
import { BLOG_CATEGORIES } from "@/constants/blog";
import type { SitemapPost } from "@/lib/db/post-query";
import type { SitemapProperty } from "@/lib/db/properties";
import type { PageSlug } from "@/constants/pages";

export type SitemapEntry = { url: string; lastModified?: Date };

/** Path of each static page; `home` is the site root. */
export const PAGE_PATHS: Record<PageSlug, string> = {
  home: "/",
  about: "/about",
  contacts: "/contacts",
  privacy: "/privacy",
};

/** `/catalog` plus one section per deal, taken from the same rules the catalog page uses for `index`/canonical. */
export const catalogPaths = (): string[] => {
  const states = [parseCatalogState({}), ...DEALS.map((deal) => parseCatalogState({ deal }))];
  return [...new Set(states.filter(isIndexable).map(canonicalPath))];
};

/** `/blog` plus one section per category (canonical keeps `category`, so they are indexable). */
export const blogPaths = (): string[] => ["/blog", ...BLOG_CATEGORIES.map((c) => `/blog?category=${c.key}`)];

type BuildInput = {
  siteUrl: string;
  properties: SitemapProperty[];
  /** Published, indexable posts only (the data layer filters drafts and `noindex`). */
  posts?: SitemapPost[];
  /** Slugs of static pages that may be indexed (not `noindex`). */
  indexablePages: PageSlug[];
};

const absolute = (siteUrl: string, path: string) => `${siteUrl}${path}`;

/** Pure assembly of the sitemap: static pages, catalog sections, published properties, blog sections, published posts. No changefreq/priority. */
export const buildSitemapEntries = ({ siteUrl, properties, posts = [], indexablePages }: BuildInput): SitemapEntry[] => [
  ...indexablePages.map((slug) => ({ url: absolute(siteUrl, PAGE_PATHS[slug]) })),
  ...catalogPaths().map((path) => ({ url: absolute(siteUrl, path) })),
  ...properties.map((p) => ({
    url: absolute(siteUrl, `/catalog/${p.slug}`),
    lastModified: new Date(p.updated_at),
  })),
  ...blogPaths().map((path) => ({ url: absolute(siteUrl, path) })),
  ...posts.map((p) => ({
    url: absolute(siteUrl, `/blog/${p.slug}`),
    lastModified: new Date(p.updated_at),
  })),
];
