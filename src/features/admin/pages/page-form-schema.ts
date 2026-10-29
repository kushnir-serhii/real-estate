import { z } from "zod";
import { PAGE_SLUGS } from "@/constants/pages";
import type { PageContent, PageSlug } from "@/constants/pages";

/**
 * Admin static-page form: one schema for the browser and the server (no server-only imports).
 * Hard limits keep the DB sane; the recommended SEO lengths are only a warning in the form.
 */

export const PAGE_LIMITS = {
  title: 120,
  body: 50_000,
  seoTitle: 120,
  seoDescription: 320,
} as const;

export const PAGE_TEXT_FIELDS = ["title", "body", "seo_title", "seo_description"] as const;
export type PageTextField = (typeof PAGE_TEXT_FIELDS)[number];

/** What the form holds: text as typed, switches as booleans. */
export type PageFormRaw = Record<PageTextField, string> & { noindex: boolean; is_draft: boolean };

export type PageFormErrors = Partial<Record<PageTextField, string>>;

/** What gets written to `pages` (empty SEO fields are null: the public page falls back). */
export type PageFormValues = PageContent;

const TRUE_VALUES = new Set(["on", "true", "1", "yes"]);

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `${label}: не більше ${max} символів` })
    .transform((value) => (value === "" ? null : value));

export const pageFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: "Вкажіть заголовок сторінки" })
    .max(PAGE_LIMITS.title, { error: `Заголовок: не більше ${PAGE_LIMITS.title} символів` }),
  // Not trimmed: leading spaces can matter in Markdown (indented lists); only trailing blank lines go.
  body: z
    .string()
    .transform((value) => value.trimEnd())
    .pipe(z.string().max(PAGE_LIMITS.body, { error: `Текст: не більше ${PAGE_LIMITS.body} символів` })),
  seo_title: optionalText("SEO-заголовок", PAGE_LIMITS.seoTitle),
  seo_description: optionalText("SEO-опис", PAGE_LIMITS.seoDescription),
  noindex: z.boolean(),
  is_draft: z.boolean(),
});

export const pageSlugSchema = z.enum(PAGE_SLUGS);

type ParseResult = { ok: true; values: PageFormValues } | { ok: false; errors: PageFormErrors };

/** Validates the form; one message per field. The draft flag only exists for the privacy page. */
export const parsePageForm = (slug: PageSlug, raw: PageFormRaw): ParseResult => {
  const parsed = pageFormSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: PageFormErrors = {};
    for (const issue of parsed.error.issues) {
      const field = PAGE_TEXT_FIELDS.find((name) => name === issue.path[0]);
      if (field && !errors[field]) errors[field] = issue.message;
    }
    return { ok: false, errors };
  }
  return { ok: true, values: { ...parsed.data, is_draft: slug === "privacy" ? parsed.data.is_draft : false } };
};

const text = (value: FormDataEntryValue | null) => (typeof value === "string" ? value : "");

/** Reads the posted form into `PageFormRaw` (missing fields are empty / off). */
export const readPageFormRaw = (formData: FormData): PageFormRaw => ({
  title: text(formData.get("title")),
  body: text(formData.get("body")),
  seo_title: text(formData.get("seo_title")),
  seo_description: text(formData.get("seo_description")),
  noindex: TRUE_VALUES.has(text(formData.get("noindex"))),
  is_draft: TRUE_VALUES.has(text(formData.get("is_draft"))),
});

/** Stored / default content as form values. */
export const pageToFormRaw = (page: PageContent): PageFormRaw => ({
  title: page.title,
  body: page.body,
  seo_title: page.seo_title ?? "",
  seo_description: page.seo_description ?? "",
  noindex: page.noindex,
  is_draft: page.is_draft,
});

export const samePageFormValues = (a: PageFormRaw, b: PageFormRaw): boolean =>
  PAGE_TEXT_FIELDS.every((field) => a[field] === b[field]) && a.noindex === b.noindex && a.is_draft === b.is_draft;
