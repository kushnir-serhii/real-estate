import { BRAND } from "./brand";

// Mock — replace for the real agency. Keep the keys in sync with the check constraint in the posts migration.
export const BLOG_CATEGORIES = [
  { key: "buyers", label: "Покупцям" },
  { key: "sellers", label: "Продавцям" },
  { key: "rent", label: "Оренда" },
  { key: "market", label: "Ринок" },
  { key: "tips", label: "Поради" },
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number]["key"];

// Cast: `map` loses the non-empty tuple type that z.enum needs; the keys come from the const array above.
export const BLOG_CATEGORY_KEYS = BLOG_CATEGORIES.map((category) => category.key) as [BlogCategory, ...BlogCategory[]];

export const BLOG_PAGE_SIZE = 6;

/** Related properties shown under a post. */
export const BLOG_RELATED_MAX = 3;

/** Shown as the author when a post has no agent. */
export const BLOG_DEFAULT_AUTHOR = `Команда ${BRAND.name}`;

export const isBlogCategory = (value: unknown): value is BlogCategory =>
  BLOG_CATEGORIES.some((category) => category.key === value);

export const blogCategoryLabel = (key: BlogCategory): string =>
  BLOG_CATEGORIES.find((category) => category.key === key)?.label ?? key;
