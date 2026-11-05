import { z } from "zod";
import { BLOG_CATEGORY_KEYS } from "@/constants/blog";
import { POST_STATUSES } from "@/lib/db/post-query";
import type { AdminPostFilters } from "@/lib/db/post-query";
import { ADMIN_BLOG_PATH } from "./post-form-values";

/** Admin posts list: URL filters (`status`, `category`, `q`, `page`), invalid values fall back to the defaults. */

export const ADMIN_POST_SEARCH_MAX_LENGTH = 100;

export const POST_STATUS_FILTERS = ["all", ...POST_STATUSES] as const;
export const POST_CATEGORY_FILTERS = ["all", ...BLOG_CATEGORY_KEYS] as const;

export type PostsViewFilters = {
  status: (typeof POST_STATUS_FILTERS)[number];
  category: (typeof POST_CATEGORY_FILTERS)[number];
  q?: string | undefined;
  page: number;
};

export type PostsSearchParams = Record<string, string | string[] | undefined>;

const first = (v: unknown): unknown => (Array.isArray(v) ? v[0] : v);

const choice = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(first, z.enum(values).catch("all"));

const schema = z.object({
  status: choice(POST_STATUS_FILTERS),
  category: choice(POST_CATEGORY_FILTERS),
  q: z.preprocess(
    (v) => {
      const s = first(v);
      if (typeof s !== "string") return undefined;
      const t = s.trim().slice(0, ADMIN_POST_SEARCH_MAX_LENGTH).trim();
      return t === "" ? undefined : t;
    },
    z.string().optional(),
  ),
  page: z.preprocess(first, z.coerce.number().int().min(1).max(100_000).catch(1)),
});

/** Never throws. */
export const parsePostsFilters = (params: PostsSearchParams): PostsViewFilters =>
  schema.parse({ status: params.status, category: params.category, q: params.q, page: params.page });

/** What the data facade takes (`all` means no filter). */
export const toAdminPostFilters = (filters: PostsViewFilters): AdminPostFilters => ({
  status: filters.status === "all" ? undefined : filters.status,
  category: filters.category === "all" ? undefined : filters.category,
  q: filters.q,
  page: filters.page,
});

/** Query string for a link, defaults dropped; changing a filter (not the page) resets the page. */
export const postsSearchParams = (
  filters: PostsViewFilters,
  overrides: Partial<PostsViewFilters> = {},
): URLSearchParams => {
  const changesFilter = Object.keys(overrides).some((key) => key !== "page");
  const next: PostsViewFilters = {
    ...filters,
    ...overrides,
    ...(changesFilter && !("page" in overrides) ? { page: 1 } : {}),
  };
  const params = new URLSearchParams();
  if (next.status !== "all") params.set("status", next.status);
  if (next.category !== "all") params.set("category", next.category);
  if (next.q) params.set("q", next.q);
  if (next.page > 1) params.set("page", String(next.page));
  return params;
};

export const postsHref = (filters: PostsViewFilters, overrides: Partial<PostsViewFilters> = {}): string => {
  const query = postsSearchParams(filters, overrides).toString();
  return query ? `${ADMIN_BLOG_PATH}?${query}` : ADMIN_BLOG_PATH;
};

export const hasActivePostFilters = (f: PostsViewFilters): boolean =>
  f.status !== "all" || f.category !== "all" || Boolean(f.q);

/** The GET form submits every field, also defaults (`q=&status=all`). */
export const hasDefaultPostParams = (params: PostsSearchParams): boolean =>
  Object.values(params).some((v) => (Array.isArray(v) ? v.some((x) => x === "" || x === "all") : v === "" || v === "all"));
