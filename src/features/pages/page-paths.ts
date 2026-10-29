import { PAGE_SLUGS } from "@/constants/pages";
import type { PageSlug } from "@/constants/pages";

/** Public path of each static page. */
export const PAGE_PATHS: Record<PageSlug, string> = {
  home: "/",
  about: "/about",
  contacts: "/contacts",
  privacy: "/privacy",
};

/** Narrows a route param to one of the fixed slugs (anything else is a 404). */
export const isPageSlug = (value: string): value is PageSlug => PAGE_SLUGS.some((slug) => slug === value);
