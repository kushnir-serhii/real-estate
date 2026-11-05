import { slugifyBase } from "@/lib/sync/slugify";

/** Longest slug the post form suggests. */
export const POST_SLUG_MAX = 80;

/**
 * A URL slug from a title: Ukrainian transliterated (KMU 2010, same as property slugs), dash-separated,
 * cut on a word boundary. No random suffix: the admin shows a taken slug as a field error instead.
 */
export const slugifyTitle = (title: string): string => slugifyBase(title, POST_SLUG_MAX);
