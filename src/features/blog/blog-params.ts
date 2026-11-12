import { isBlogCategory } from "@/constants/blog";
import type { BlogCategory } from "@/constants/blog";

export type BlogSearchParams = Record<string, string | string[] | undefined>;

/** What the visitor asked for, cleaned. An unknown category means all posts; a bad page means page 1. */
export type BlogState = { category?: BlogCategory; page: number };

const first = (value: string | string[] | undefined): string | undefined =>
  (Array.isArray(value) ? value[0] : value)?.trim();

export const parseBlogState = (params: BlogSearchParams): BlogState => {
  const category = first(params.category);
  const page = Number(first(params.page));
  return {
    category: isBlogCategory(category) ? category : undefined,
    page: Number.isInteger(page) && page >= 1 && page <= 1000 ? page : 1,
  };
};

/** Canonical link for a state; page 1 and «all» leave no parameter. */
export const blogHref = (state: BlogState, patch: Partial<BlogState> = {}): string => {
  const next = { ...state, ...patch };
  const query = new URLSearchParams();
  if (next.category) query.set("category", next.category);
  if (next.page > 1) query.set("page", String(next.page));
  const text = query.toString();
  return text ? `/blog?${text}` : "/blog";
};
