import { BRAND } from "@/constants/brand";
import type { PageContent } from "@/constants/pages";

/** Next `metadata.title`: plain (the root template appends « — brand») or `absolute`. */
export type PageSeoTitle = string | { absolute: string };

type PageSeoInput = Pick<PageContent, "title" | "seo_title" | "seo_description">;

/** Mirrors the root layout's `title.template`. */
const withBrand = (title: string) => `${title} — ${BRAND.name}`;

/** A custom SEO title is used as is (it carries the brand itself); otherwise the page title + the brand. */
export const pageSeoTitle = (page: PageSeoInput): PageSeoTitle => {
  const manual = page.seo_title?.trim();
  if (manual) return { absolute: manual };
  return page.title.trim();
};

/** The title as it reaches the browser tab and Google (same rule as `pageSeoTitle`). */
export const pageSeoTitleText = (page: PageSeoInput): string => {
  const title = pageSeoTitle(page);
  return typeof title === "string" ? withBrand(title) : title.absolute;
};

/** The custom SEO description, else the site-wide one from the root layout. */
export const pageSeoDescription = (page: PageSeoInput): string =>
  page.seo_description?.trim() || BRAND.siteDescription;

/** Recommended lengths for Google snippets (soft limits: a warning, not an error). */
export const SEO_RECOMMENDED = {
  title: { min: 50, max: 60 },
  description: { min: 120, max: 155 },
} as const;

export type SeoLengthStatus = "empty" | "short" | "ok" | "long";

/** Where a length falls against the recommended range. */
export const seoLengthStatus = (length: number, range: { min: number; max: number }): SeoLengthStatus => {
  if (length === 0) return "empty";
  if (length < range.min) return "short";
  if (length > range.max) return "long";
  return "ok";
};
