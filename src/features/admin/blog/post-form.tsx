"use client";

import { CircleAlert, CircleCheck, EyeOff, LoaderCircle, Save, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BRAND } from "@/constants/brand";
import { BLOG_CATEGORIES, BLOG_DEFAULT_AUTHOR } from "@/constants/blog";
import { SerpPreview } from "@/features/admin/pages/serp-preview";
import { SeoLengthHint } from "@/features/admin/pages/seo-length-hint";
import { PropertyField, fieldDescribedBy } from "@/features/admin/properties/property-field";
import { PropertyFormSection } from "@/features/admin/properties/property-form-section";
import { SELECT_CLASS } from "@/features/catalog/catalog-labels";
import { SEO_RECOMMENDED, pageSeoTitleText } from "@/features/pages/page-seo";
import { slugifyTitle } from "@/lib/db/post-slug";
import { cn } from "@/lib/utils";
import { savePost } from "./actions";
import { PostBodyField } from "./post-body-field";
import { INITIAL_POST_FORM_STATE, POST_TEXT_FIELDS, postEditHref, samePostFormValues } from "./post-form-values";
import type {
  PostAuthorOption,
  PostFormErrors,
  PostFormRaw,
  PostFormState,
  PostIntent,
  PostTextField,
} from "./post-form-values";

/** Mirrors `POST_LIMITS` in `post-schemas.ts` (that file imports zod, which the browser bundle avoids). */
const LIMITS = { title: 160, slug: 80, excerpt: 300, tags: 10, tag: 30, seoTitle: 120, seoDescription: 320 } as const;

type PostFormProps = {
  /** The post's id when editing; null for a new post. */
  postId: string | null;
  initialValues: PostFormRaw;
  /** Published at least once: the address is locked. */
  everPublished: boolean;
  /** Currently on the site. */
  published: boolean;
  agents: PostAuthorOption[];
  siteUrl: string;
  /** «Обкладинка» and «Об'єкти до статті» (they need a saved post); a new post gets a hint instead. */
  mediaSections?: React.ReactNode;
};

type Notice = "draft" | "published" | "unpublished" | null;

const NOTICE_TEXT: Record<Exclude<Notice, null>, string> = {
  draft: "Чернетку збережено. На сайті її не видно.",
  published: "Збережено. Стаття на сайті оновилася.",
  unpublished: "Знято з публікації. Статті більше немає на сайті.",
};

const STATUS_LINE = "flex items-start gap-1.5 text-sm font-medium wrap-anywhere";
const CHECKBOX_LABEL = "flex min-h-11 items-center gap-3 text-sm font-medium";
const CHECKBOX = "size-5 shrink-0 accent-primary";

const NUMBER = new Intl.NumberFormat("uk-UA");
const lengthTone = (length: number, max: number) => (length > max ? "font-medium text-destructive" : undefined);

const countTags = (value: string) => value.split(/[,\n]/).filter((part) => part.trim() !== "").length;

/**
 * Blog post editor: text (TipTap, saved as Markdown), address, category, tags, author, SEO and indexing, with
 * «save draft / publish» buttons. Controlled inputs: React resets uncontrolled forms after an action, which would
 * drop input. Cover and related properties (saved at once by their own actions) sit between the text and the SEO.
 */
export const PostForm = ({ postId, initialValues, everPublished, published, agents, siteUrl, mediaSections }: PostFormProps) => {
  const id = useId();
  const router = useRouter();
  const fieldId = (field: PostTextField | "noindex") => `${id}-${field}`;
  const isNew = postId === null;

  const [values, setValues] = useState<PostFormRaw>(initialValues);
  const [baseline, setBaseline] = useState<PostFormRaw>(initialValues);
  // A new post follows its title until the admin edits the address by hand.
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [locked, setLocked] = useState(everPublished);
  const [isPublished, setIsPublished] = useState(published);
  const [notice, setNotice] = useState<Notice>(null);
  const valuesRef = useRef(values);
  const publishedRef = useRef(published);

  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  const [state, formAction, pending] = useActionState(
    async (prev: PostFormState, formData: FormData): Promise<PostFormState> => {
      const submitted = valuesRef.current;
      const next = await savePost(prev, formData);
      if (next.status === "created") {
        setBaseline(submitted);
        router.replace(postEditHref(next.id));
      } else if (next.status === "saved") {
        setBaseline(submitted);
        setLocked((was) => was || next.published);
        setIsPublished(next.published);
        setNotice(next.published ? "published" : publishedRef.current ? "unpublished" : "draft");
        publishedRef.current = next.published;
      } else {
        setNotice(null);
      }
      return next;
    },
    INITIAL_POST_FORM_STATE,
  );

  const dirty = !samePostFormValues(values, baseline);

  // Leaving the page with unsaved changes asks the browser's «leave the site?» first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const errors: PostFormErrors = state.status === "invalid" ? state.errors : {};

  // Move the focus to the first field to fix.
  useEffect(() => {
    if (state.status !== "invalid") return;
    const first = POST_TEXT_FIELDS.find((field) => state.errors[field]);
    if (first) document.getElementById(`${id}-${first}`)?.focus();
  }, [state, id]);

  const setText = (field: PostTextField, value: string) => setValues((v) => ({ ...v, [field]: value }));

  const onTitleChange = (title: string) =>
    setValues((v) => ({ ...v, title, slug: slugTouched ? v.slug : slugifyTitle(title) }));

  const controlProps = (field: PostTextField, hasHint = true) => ({
    id: fieldId(field),
    name: field,
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": fieldDescribedBy(fieldId(field), hasHint, errors[field]),
  });

  // Submitted by hand, not via `action`: React would reset the form after the action.
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = event.nativeEvent instanceof SubmitEvent ? event.nativeEvent.submitter : null;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => formAction(formData));
  };

  const titleLength = values.title.trim().length;
  const excerptLength = values.excerpt.trim().length;
  const tagCount = countTags(values.tags);
  const previewTitle =
    titleLength > 0 || values.seo_title.trim()
      ? pageSeoTitleText({ title: values.title, seo_title: values.seo_title, seo_description: null })
      : "Без заголовка";
  const previewDescription =
    values.seo_description.trim() || values.excerpt.trim() || BRAND.siteDescription;

  const hasAuthor = agents.some((agent) => agent.id === values.author_agent_id);
  const showNotice = !pending && !dirty && notice !== null;
  const showError = !pending && notice === null && (state.status === "error" || state.status === "invalid");

  const intentButtons: { intent: PostIntent; label: string; busy: string; icon: typeof Save; primary: boolean }[] =
    isPublished
      ? [
          { intent: "publish", label: "Зберегти зміни", busy: "Зберігаємо…", icon: Save, primary: true },
          { intent: "draft", label: "Зняти з публікації", busy: "Знімаємо…", icon: EyeOff, primary: false },
        ]
      : [
          { intent: "publish", label: "Опублікувати", busy: "Публікуємо…", icon: Send, primary: true },
          { intent: "draft", label: "Зберегти чернетку", busy: "Зберігаємо…", icon: Save, primary: false },
        ];

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-w-0 flex-col gap-6">
      {postId !== null && <input type="hidden" name="id" value={postId} />}

      <PropertyFormSection id="basics" title="Основне">
        <PropertyField
          id={fieldId("title")}
          label="Заголовок"
          error={errors.title}
          hint={
            <span className={cn("tabular-nums", lengthTone(titleLength, LIMITS.title))}>
              {titleLength} з {LIMITS.title} символів.
            </span>
          }
        >
          <Input
            {...controlProps("title")}
            autoComplete="off"
            value={values.title}
            onChange={(e) => onTitleChange(e.target.value)}
          />
        </PropertyField>

        <PropertyField
          id={fieldId("slug")}
          label="Адреса статті"
          error={errors.slug}
          hint={
            locked
              ? "Статтю вже публікували, тому адресу змінити не можна: вона вже в пошуку Google."
              : slugTouched
                ? "Лише латинські літери, цифри та дефіси. Після першої публікації адреса блокується."
                : "Підставляється із заголовка. Можна змінити вручну; після першої публікації адреса блокується."
          }
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-sm text-muted-foreground">/blog/</span>
            <Input
              {...controlProps("slug")}
              autoComplete="off"
              spellCheck={false}
              readOnly={locked}
              value={values.slug}
              maxLength={LIMITS.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setText("slug", e.target.value);
              }}
              className={cn("font-mono text-sm", locked && "bg-muted text-muted-foreground")}
            />
          </div>
        </PropertyField>

        <div className="grid gap-4 sm:grid-cols-2">
          <PropertyField id={fieldId("category")} label="Категорія" error={errors.category}>
            <select
              {...controlProps("category", false)}
              value={values.category}
              onChange={(e) => setText("category", e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">Оберіть категорію</option>
              {BLOG_CATEGORIES.map((category) => (
                <option key={category.key} value={category.key}>
                  {category.label}
                </option>
              ))}
            </select>
          </PropertyField>

          <PropertyField id={fieldId("author_agent_id")} label="Автор" error={errors.author_agent_id}>
            <select
              {...controlProps("author_agent_id", false)}
              value={values.author_agent_id}
              onChange={(e) => setText("author_agent_id", e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">Без автора ({BLOG_DEFAULT_AUTHOR})</option>
              {values.author_agent_id !== "" && !hasAuthor && (
                <option value={values.author_agent_id}>Агент, який більше не працює</option>
              )}
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </PropertyField>
        </div>

        <PropertyField
          id={fieldId("excerpt")}
          label="Короткий опис"
          error={errors.excerpt}
          hint={
            <span>
              Показується в списку статей і в пошуку, якщо немає SEO-опису. Обов&apos;язковий для публікації.{" "}
              <span className={cn("tabular-nums", lengthTone(excerptLength, LIMITS.excerpt))}>
                {excerptLength} з {LIMITS.excerpt} символів.
              </span>
            </span>
          }
        >
          <Textarea
            {...controlProps("excerpt")}
            value={values.excerpt}
            onChange={(e) => setText("excerpt", e.target.value)}
            className="min-h-24"
          />
        </PropertyField>

        <PropertyField
          id={fieldId("tags")}
          label="Теги"
          error={errors.tags}
          hint={
            <span>
              Через кому, наприклад: іпотека, новобудови. Не більше {LIMITS.tags} тегів, до {LIMITS.tag} символів
              кожен.{" "}
              <span className={cn("tabular-nums", lengthTone(tagCount, LIMITS.tags))}>Тегів: {tagCount}.</span>
            </span>
          }
        >
          <Input
            {...controlProps("tags")}
            autoComplete="off"
            value={values.tags}
            onChange={(e) => setText("tags", e.target.value)}
          />
        </PropertyField>
      </PropertyFormSection>

      <PropertyFormSection
        id="text"
        title="Текст статті"
        description="Заголовки, жирний і курсив, списки, цитата, посилання. Без картинок у тексті: фото додається як обкладинка."
      >
        <PropertyField
          id={fieldId("body")}
          label="Текст"
          error={errors.body}
          hint={
            <span className="tabular-nums">
              {NUMBER.format(values.body.length)} символів. Обов&apos;язковий для публікації.
            </span>
          }
        >
          <PostBodyField
            id={fieldId("body")}
            name="body"
            value={values.body}
            initialMarkdown={initialValues.body}
            onChange={(markdown) => setText("body", markdown)}
            invalid={Boolean(errors.body)}
            describedBy={fieldDescribedBy(fieldId("body"), true, errors.body)}
          />
        </PropertyField>
      </PropertyFormSection>

      {isNew ? (
        <PropertyFormSection id="media" title="Обкладинка та об’єкти">
          <p className="max-w-prose text-sm text-muted-foreground">
            Обкладинку й пов’язані об’єкти можна додати після збереження чернетки: натисніть «Зберегти чернетку».
          </p>
        </PropertyFormSection>
      ) : (
        mediaSections
      )}

      <PropertyFormSection
        id="seo"
        title="SEO"
        description="Як стаття виглядає в пошуку Google. Можна не заповнювати: тоді підставиться заголовок статті з назвою агентства й короткий опис."
      >
        <PropertyField
          id={fieldId("seo_title")}
          label="SEO-заголовок"
          error={errors.seo_title}
          hint={
            <SeoLengthHint
              length={values.seo_title.trim().length}
              range={SEO_RECOMMENDED.title}
              limit={LIMITS.seoTitle}
              emptyText={`Порожньо — у пошуку буде заголовок статті з назвою агентства. Якщо заповнюєте, рекомендовано ${SEO_RECOMMENDED.title.min}–${SEO_RECOMMENDED.title.max} символів разом із назвою агентства.`}
            />
          }
        >
          <Input
            {...controlProps("seo_title")}
            autoComplete="off"
            value={values.seo_title}
            onChange={(e) => setText("seo_title", e.target.value)}
          />
        </PropertyField>

        <PropertyField
          id={fieldId("seo_description")}
          label="SEO-опис"
          error={errors.seo_description}
          hint={
            <SeoLengthHint
              length={values.seo_description.trim().length}
              range={SEO_RECOMMENDED.description}
              limit={LIMITS.seoDescription}
              emptyText={`Порожньо — у пошуку буде короткий опис статті. Якщо заповнюєте, рекомендовано ${SEO_RECOMMENDED.description.min}–${SEO_RECOMMENDED.description.max} символів.`}
            />
          }
        >
          <Textarea
            {...controlProps("seo_description")}
            value={values.seo_description}
            onChange={(e) => setText("seo_description", e.target.value)}
            className="min-h-24"
          />
        </PropertyField>

        <SerpPreview
          siteUrl={siteUrl}
          path={`/blog/${values.slug || "…"}`}
          title={previewTitle}
          description={previewDescription}
          noindex={values.noindex}
        />
      </PropertyFormSection>

      <PropertyFormSection id="indexing" title="Індексація">
        <div className="flex flex-col gap-1">
          <label htmlFor={fieldId("noindex")} className={CHECKBOX_LABEL}>
            <input
              id={fieldId("noindex")}
              type="checkbox"
              name="noindex"
              checked={values.noindex}
              onChange={(e) => setValues((v) => ({ ...v, noindex: e.target.checked }))}
              aria-describedby={`${fieldId("noindex")}-hint`}
              className={CHECKBOX}
            />
            Не показувати в пошуку (noindex)
          </label>
          <p id={`${fieldId("noindex")}-hint`} className="max-w-prose text-sm text-muted-foreground">
            Google не показуватиме статтю в результатах, і вона зникне з карти сайту (sitemap.xml). Відвідувачі
            блогу й далі її бачать.
          </p>
        </div>
      </PropertyFormSection>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 lg:mx-0 lg:px-0">
        {intentButtons.map(({ intent, label, busy, icon: Icon, primary }) => (
          <Button
            key={intent}
            type="submit"
            name="intent"
            value={intent}
            variant={primary ? "default" : "outline"}
            disabled={pending}
            className="w-full sm:w-auto"
          >
            {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Icon aria-hidden="true" />}
            {pending ? busy : label}
          </Button>
        ))}

        <div className="flex min-w-0 flex-col gap-1">
          <p role="status" className={cn(STATUS_LINE, "text-success empty:hidden")}>
            {showNotice && notice !== null && (
              <>
                <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {NOTICE_TEXT[notice]}
              </>
            )}
          </p>

          {showError && (
            <p role="alert" className={cn(STATUS_LINE, "text-destructive")}>
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {state.status === "error" ? state.message : "Не збережено: виправте позначені поля."}
            </p>
          )}

          {!pending && dirty && <p className="text-sm text-muted-foreground">Є незбережені зміни</p>}
        </div>
      </div>
    </form>
  );
};
