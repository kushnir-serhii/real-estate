import { BLOG_PAGE, blogCategoryLabel } from "@/constants/blog";
import { SEO_RECOMMENDED } from "@/features/pages/page-seo";
import { blogHref } from "./blog-params";
import type { BlogState } from "./blog-params";

/** Cuts text to `max` characters on a word boundary, adding «…». Shorter text is returned as is. */
export const trimOnWord = (text: string, max: number): string => {
  const clean = text.trim().replace(/\s+/g, " ");
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,.;:!?—-]+$/, "")}…`;
};

/** Title of the list page: «Блог», «Покупцям — Блог», with «— сторінка N» from page 2. The root template adds the brand. */
export const blogListTitle = (state: BlogState): string => {
  const base = state.category ? `${blogCategoryLabel(state.category)} — ${BLOG_PAGE.eyebrow}` : BLOG_PAGE.eyebrow;
  return state.page > 1 ? `${base} — сторінка ${state.page}` : base;
};

/** Canonical of the list: keeps the category, drops `page=1`. */
export const blogListCanonical = (state: BlogState): string => blogHref(state);

type PostSeoInput = { title: string; excerpt: string; seo_title: string | null; seo_description: string | null };

/** A custom SEO title is used as is (it carries the brand itself); otherwise the post title + the brand via the template. */
export const blogPostSeoTitle = (post: PostSeoInput): string | { absolute: string } => {
  const manual = post.seo_title?.trim();
  return manual ? { absolute: manual } : post.title.trim();
};

export const blogPostSeoDescription = (post: PostSeoInput): string =>
  trimOnWord(post.seo_description?.trim() || post.excerpt, SEO_RECOMMENDED.description.max);
