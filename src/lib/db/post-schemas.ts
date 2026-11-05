import { z } from "zod";
import { BLOG_CATEGORY_KEYS } from "@/constants/blog";
import { POST_STATUSES } from "./post-query";

/** Post input: validated on the server (admin actions) and reusable by the admin form. Not for client bundles (zod). */

export const POST_LIMITS = {
  title: 160,
  slug: 80,
  excerpt: 300,
  body: 100_000,
  seoTitle: 120,
  seoDescription: 320,
  tags: 10,
  tag: 30,
  coverAlt: 200,
} as const;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `${label}: не більше ${max} символів` })
    .nullish()
    .transform((value) => (value === undefined || value === null || value === "" ? null : value));

export const postInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: "Вкажіть заголовок" })
    .max(POST_LIMITS.title, { error: `Заголовок: не більше ${POST_LIMITS.title} символів` }),
  slug: z
    .string()
    .trim()
    .min(1, { error: "Вкажіть адресу статті" })
    .max(POST_LIMITS.slug, { error: `Адреса: не більше ${POST_LIMITS.slug} символів` })
    .regex(SLUG_PATTERN, { error: "Адреса: лише латинські літери, цифри та дефіси" }),
  excerpt: z
    .string()
    .trim()
    .max(POST_LIMITS.excerpt, { error: `Короткий опис: не більше ${POST_LIMITS.excerpt} символів` })
    .default(""),
  // Not trimmed at the start: indentation can matter in Markdown.
  body: z
    .string()
    .transform((value) => value.trimEnd())
    .pipe(z.string().max(POST_LIMITS.body, { error: `Текст: не більше ${POST_LIMITS.body} символів` }))
    .default(""),
  category: z.enum(BLOG_CATEGORY_KEYS, { error: "Оберіть категорію" }),
  tags: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(POST_LIMITS.tag, { error: `Тег: не більше ${POST_LIMITS.tag} символів` }),
    )
    .max(POST_LIMITS.tags, { error: `Не більше ${POST_LIMITS.tags} тегів` })
    .default([]),
  author_agent_id: z.uuid().nullish().transform((value) => value ?? null),
  status: z.enum(POST_STATUSES),
  seo_title: optionalText("SEO-заголовок", POST_LIMITS.seoTitle),
  seo_description: optionalText("SEO-опис", POST_LIMITS.seoDescription),
  noindex: z.boolean().default(false),
});

export type PostInput = z.infer<typeof postInputSchema>;
export type PostInputRaw = z.input<typeof postInputSchema>;

export const postCoverSchema = z.object({
  key: z.string().trim().min(1),
  alt: optionalText("Опис фото", POST_LIMITS.coverAlt),
});
