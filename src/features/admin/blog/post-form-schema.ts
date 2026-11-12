import { postInputSchema } from "@/lib/db/post-schemas";
import type { PostInputRaw } from "@/lib/db/post-schemas";
import { POST_INTENTS, POST_TEXT_FIELDS } from "./post-form-values";
import type { PostFormErrors, PostFormRaw, PostIntent, PostTextField } from "./post-form-values";

/** Server side of the post form: reads the posted fields and validates them with the shared zod schema. */

const text = (value: FormDataEntryValue | null) => (typeof value === "string" ? value : "");

const TRUE_VALUES = new Set(["on", "true", "1", "yes"]);

export const readPostFormRaw = (formData: FormData): PostFormRaw => ({
  title: text(formData.get("title")),
  slug: text(formData.get("slug")),
  category: text(formData.get("category")),
  tags: text(formData.get("tags")),
  excerpt: text(formData.get("excerpt")),
  body: text(formData.get("body")),
  author_agent_id: text(formData.get("author_agent_id")),
  seo_title: text(formData.get("seo_title")),
  seo_description: text(formData.get("seo_description")),
  noindex: TRUE_VALUES.has(text(formData.get("noindex"))),
});

export const readPostIntent = (formData: FormData): PostIntent =>
  POST_INTENTS.find((intent) => intent === formData.get("intent")) ?? "draft";

/** «a, b ,a,,c» -> ["a", "b", "c"]: trimmed, empty dropped, duplicates (any case) dropped. */
export const parseTags = (value: string): string[] => {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of value.split(/[,\n]/)) {
    const tag = part.trim().replace(/\s+/g, " ");
    const key = tag.toLowerCase();
    if (tag === "" || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }
  return tags;
};

export const PUBLISH_ERRORS = {
  excerpt: "Щоб опублікувати, додайте короткий опис: він показується в списку статей",
  body: "Щоб опублікувати, напишіть текст статті",
} as const;

type ParseResult = { ok: true; input: PostInputRaw } | { ok: false; errors: PostFormErrors };

/** Validates the form; one message per field. Publishing also needs a non-empty excerpt and body. */
export const parsePostForm = (raw: PostFormRaw, intent: PostIntent): ParseResult => {
  const parsed = postInputSchema.safeParse({
    title: raw.title,
    slug: raw.slug,
    excerpt: raw.excerpt,
    body: raw.body,
    category: raw.category,
    tags: parseTags(raw.tags),
    author_agent_id: raw.author_agent_id === "" ? null : raw.author_agent_id,
    status: intent === "publish" ? "published" : "draft",
    seo_title: raw.seo_title,
    seo_description: raw.seo_description,
    noindex: raw.noindex,
  });

  const errors: PostFormErrors = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field: PostTextField | undefined = POST_TEXT_FIELDS.find((name) => name === issue.path[0]);
      if (field && !errors[field]) errors[field] = issue.message;
    }
  }
  if (intent === "publish") {
    if (raw.excerpt.trim() === "" && !errors.excerpt) errors.excerpt = PUBLISH_ERRORS.excerpt;
    if (raw.body.trim() === "" && !errors.body) errors.body = PUBLISH_ERRORS.body;
  }
  if (!parsed.success || Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    input: parsed.data,
  };
};
