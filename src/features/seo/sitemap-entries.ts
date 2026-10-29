import { DEALS } from "@/lib/db/property-values";
import { canonicalPath, isIndexable, parseCatalogState } from "@/features/catalog/catalog-params";
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

type BuildInput = {
  siteUrl: string;
  properties: SitemapProperty[];
  /** Slugs of static pages that may be indexed (not `noindex`). */
  indexablePages: PageSlug[];
};

const absolute = (siteUrl: string, path: string) => `${siteUrl}${path}`;

/** Pure assembly of the sitemap: static pages, catalog sections, published properties. No changefreq/priority. */
export const buildSitemapEntries = ({ siteUrl, properties, indexablePages }: BuildInput): SitemapEntry[] => [
  ...indexablePages.map((slug) => ({ url: absolute(siteUrl, PAGE_PATHS[slug]) })),
  ...catalogPaths().map((path) => ({ url: absolute(siteUrl, path) })),
  ...properties.map((p) => ({
    url: absolute(siteUrl, `/catalog/${p.slug}`),
    lastModified: new Date(p.updated_at),
  })),
];
