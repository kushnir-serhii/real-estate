import type { AdminPost } from "@/lib/db/post-query";

/** Blog post form: types and helpers shared by the browser and the server (no zod, no server-only). */

export const ADMIN_BLOG_PATH = "/admin/blog";
export const NEW_POST_PATH = "/admin/blog/new";
export const postEditHref = (id: string): string => `${ADMIN_BLOG_PATH}/${id}`;

export const POST_TEXT_FIELDS = [
  "title",
  "slug",
  "category",
  "tags",
  "excerpt",
  "body",
  "author_agent_id",
  "seo_title",
  "seo_description",
] as const;
export type PostTextField = (typeof POST_TEXT_FIELDS)[number];

/** What the form holds: text as typed (tags as one comma-separated string), the switch as a boolean. */
export type PostFormRaw = Record<PostTextField, string> & { noindex: boolean };

export type PostFormErrors = Partial<Record<PostTextField, string>>;

/** `draft`: save as a draft / unpublish; `publish`: save as published (needs an excerpt and a body). */
export const POST_INTENTS = ["draft", "publish"] as const;
export type PostIntent = (typeof POST_INTENTS)[number];

export const EMPTY_POST_FORM: PostFormRaw = {
  title: "",
  slug: "",
  category: "",
  tags: "",
  excerpt: "",
  body: "",
  author_agent_id: "",
  seo_title: "",
  seo_description: "",
  noindex: false,
};

export const postToFormRaw = (post: AdminPost): PostFormRaw => ({
  title: post.title,
  slug: post.slug,
  category: post.category,
  tags: post.tags.join(", "),
  excerpt: post.excerpt,
  body: post.body,
  author_agent_id: post.author_agent_id ?? "",
  seo_title: post.seo_title ?? "",
  seo_description: post.seo_description ?? "",
  noindex: post.noindex,
});

export const samePostFormValues = (a: PostFormRaw, b: PostFormRaw): boolean =>
  POST_TEXT_FIELDS.every((field) => a[field] === b[field]) && a.noindex === b.noindex;

/** Agent select option; `inactive`: the current author no longer works at the agency. */
export type PostAuthorOption = { id: string; name: string; inactive: boolean };

/** Result of `savePost`. */
export type PostFormState =
  | { status: "idle" }
  /** A new post was saved: go to its edit page. */
  | { status: "created"; id: string }
  | { status: "saved"; slug: string; published: boolean }
  | { status: "invalid"; errors: PostFormErrors }
  | { status: "error"; message: string };

export const INITIAL_POST_FORM_STATE: PostFormState = { status: "idle" };

/** Result of `deletePostAction`. */
export type PostDeleteState =
  | { status: "idle" }
  | { status: "deleted" }
  | { status: "error"; message: string };

export const INITIAL_POST_DELETE_STATE: PostDeleteState = { status: "idle" };
