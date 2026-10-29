"use client";

import { CircleAlert, CircleCheck, LoaderCircle, Save, TriangleAlert } from "lucide-react";
import { startTransition, useActionState, useCallback, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PageSlug } from "@/constants/pages";
import { PropertyField, fieldDescribedBy } from "@/features/admin/properties/property-field";
import { PropertyFormSection } from "@/features/admin/properties/property-form-section";
import { SEO_RECOMMENDED, pageSeoDescription, pageSeoTitleText } from "@/features/pages/page-seo";
import { cn } from "@/lib/utils";
import { savePage } from "./actions";
import { PAGE_LIMITS, PAGE_TEXT_FIELDS, samePageFormValues } from "./page-form-schema";
import type { PageFormErrors, PageFormRaw, PageTextField } from "./page-form-schema";
import { INITIAL_PAGE_FORM_STATE } from "./page-form-state";
import type { PageFormState } from "./page-form-state";
import { PAGE_CONTENT_HINTS } from "./page-labels";
import { PageResetButton } from "./page-reset-button";
import { SeoLengthHint } from "./seo-length-hint";
import { SerpPreview } from "./serp-preview";

type PageFormProps = {
  slug: PageSlug;
  initialValues: PageFormRaw;
  /** No row yet: the site shows the built-in text (reset is disabled). */
  isDefault: boolean;
  siteUrl: string;
  /** Public path of the page. */
  path: string;
};

type Notice = "saved" | "reset" | null;

const NUMBER = new Intl.NumberFormat("uk-UA");
const STATUS_LINE = "flex items-start gap-1.5 text-sm font-medium wrap-anywhere";
const CHECKBOX_LABEL = "flex min-h-11 items-center gap-3 text-sm font-medium";
const CHECKBOX = "size-5 shrink-0 accent-primary";

const MARKDOWN_SYNTAX = [
  { syntax: "## Заголовок", meaning: "розділ" },
  { syntax: "### Підзаголовок", meaning: "підрозділ" },
  { syntax: "**жирний**", meaning: "виділення" },
  { syntax: "- пункт", meaning: "список" },
  { syntax: "[текст](https://…)", meaning: "посилання" },
] as const;

const lengthTone = (length: number, max: number) => (length > max ? "font-medium text-destructive" : undefined);

/**
 * Static page editor: content, SEO (counters + a live Google preview), indexing and, for the privacy page,
 * the draft flag. Controlled inputs: React resets uncontrolled forms after an action, which would drop input.
 */
export const PageForm = ({ slug, initialValues, isDefault, siteUrl, path }: PageFormProps) => {
  const id = useId();
  const fieldId = (field: PageTextField | "noindex" | "is_draft") => `${id}-${field}`;
  const [values, setValues] = useState<PageFormRaw>(initialValues);
  const [baseline, setBaseline] = useState<PageFormRaw>(initialValues);
  const [notice, setNotice] = useState<Notice>(null);
  const valuesRef = useRef(values);

  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  const [state, formAction, pending] = useActionState(
    async (prev: PageFormState, formData: FormData): Promise<PageFormState> => {
      const submitted = valuesRef.current;
      const next = await savePage(prev, formData);
      if (next.status === "saved") {
        setBaseline(submitted);
        setNotice("saved");
      } else {
        setNotice(null);
      }
      return next;
    },
    INITIAL_PAGE_FORM_STATE,
  );

  const dirty = !samePageFormValues(values, baseline);

  // Leaving the page with unsaved changes asks the browser's «leave the site?» first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const errors: PageFormErrors = state.status === "invalid" ? state.errors : {};

  // Move the focus to the first field to fix.
  useEffect(() => {
    if (state.status !== "invalid") return;
    const first = PAGE_TEXT_FIELDS.find((field) => state.errors[field]);
    if (first) document.getElementById(`${id}-${first}`)?.focus();
  }, [state, id]);

  const onReset = useCallback((defaults: PageFormRaw) => {
    setValues(defaults);
    setBaseline(defaults);
    setNotice("reset");
  }, []);

  const setText = (field: PageTextField, value: string) => setValues((v) => ({ ...v, [field]: value }));

  const controlProps = (field: PageTextField) => ({
    id: fieldId(field),
    name: field,
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": fieldDescribedBy(fieldId(field), true, errors[field]),
  });

  // Submitted by hand, not via `action`: React would reset the form after the action.
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  };

  const titleLength = values.title.trim().length;
  const bodyLength = values.body.length;
  const previewTitle = titleLength > 0 || values.seo_title.trim() ? pageSeoTitleText(values) : "Без заголовка";

  const showNotice = !pending && !dirty && notice !== null;
  // A later reset supersedes an old save error.
  const showError = !pending && notice === null && (state.status === "error" || state.status === "invalid");

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-w-0 flex-col gap-6">
      <input type="hidden" name="slug" value={slug} />

      <PropertyFormSection id="content" title="Контент" description={PAGE_CONTENT_HINTS[slug]}>
        <PropertyField
          id={fieldId("title")}
          label="Заголовок сторінки"
          error={errors.title}
          hint={
            <span className={cn("tabular-nums", lengthTone(titleLength, PAGE_LIMITS.title))}>
              {titleLength} з {PAGE_LIMITS.title} символів.
            </span>
          }
        >
          <Input
            {...controlProps("title")}
            autoComplete="off"
            value={values.title}
            onChange={(e) => setText("title", e.target.value)}
          />
        </PropertyField>

        <PropertyField
          id={fieldId("body")}
          label="Текст"
          error={errors.body}
          hint={
            <span className="flex flex-col gap-2">
              <span>
                Форматування Markdown, порожній рядок — новий абзац.{" "}
                <span className={cn("tabular-nums", lengthTone(bodyLength, PAGE_LIMITS.body))}>
                  {NUMBER.format(bodyLength)} з {NUMBER.format(PAGE_LIMITS.body)} символів.
                </span>
              </span>
              <span className="flex flex-wrap gap-x-4 gap-y-1">
                {MARKDOWN_SYNTAX.map(({ syntax, meaning }) => (
                  <span key={syntax} className="whitespace-nowrap">
                    <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-xs text-foreground">{syntax}</code>{" "}
                    {meaning}
                  </span>
                ))}
              </span>
            </span>
          }
        >
          <Textarea
            {...controlProps("body")}
            value={values.body}
            onChange={(e) => setText("body", e.target.value)}
            className="max-h-[70dvh] min-h-64 overflow-y-auto font-mono text-sm leading-relaxed"
          />
        </PropertyField>
      </PropertyFormSection>

      <PropertyFormSection
        id="seo"
        title="SEO"
        description="Як сторінка виглядає в пошуку Google. Можна не заповнювати: тоді підставиться заголовок сторінки з назвою агентства й загальний опис сайту."
      >
        <PropertyField
          id={fieldId("seo_title")}
          label="SEO-заголовок"
          error={errors.seo_title}
          hint={
            <SeoLengthHint
              length={values.seo_title.trim().length}
              range={SEO_RECOMMENDED.title}
              limit={PAGE_LIMITS.seoTitle}
              emptyText={`Порожньо — у пошуку буде заголовок сторінки з назвою агентства. Якщо заповнюєте, рекомендовано ${SEO_RECOMMENDED.title.min}–${SEO_RECOMMENDED.title.max} символів разом із назвою агентства.`}
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
              limit={PAGE_LIMITS.seoDescription}
              emptyText={`Порожньо — у пошуку буде загальний опис сайту. Якщо заповнюєте, рекомендовано ${SEO_RECOMMENDED.description.min}–${SEO_RECOMMENDED.description.max} символів.`}
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
          path={path}
          title={previewTitle}
          description={pageSeoDescription(values)}
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
            Google та інші пошуковики не показуватимуть цю сторінку в результатах, і вона зникне з карти сайту
            (sitemap.xml). Відвідувачі сайту й далі її бачать.
          </p>
          {slug === "home" && values.noindex && (
            <p className={cn(STATUS_LINE, "mt-1 text-warning")}>
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Це головна сторінка: без неї сайт значно гірше знаходитиметься в пошуку.
            </p>
          )}
        </div>

        {slug === "privacy" && (
          <div className="flex flex-col gap-1">
            <label htmlFor={fieldId("is_draft")} className={CHECKBOX_LABEL}>
              <input
                id={fieldId("is_draft")}
                type="checkbox"
                name="is_draft"
                checked={values.is_draft}
                onChange={(e) => setValues((v) => ({ ...v, is_draft: e.target.checked }))}
                aria-describedby={`${fieldId("is_draft")}-hint`}
                className={CHECKBOX}
              />
              Чернетка політики
            </label>
            <p id={`${fieldId("is_draft")}-hint`} className="max-w-prose text-sm text-muted-foreground">
              Над текстом на сайті показується примітка «Чернетка: текст має перевірити агентство або юрист перед
              запуском». Зніміть позначку, коли текст перевірено.
            </p>
          </div>
        )}
      </PropertyFormSection>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 lg:mx-0 lg:px-0">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
          {pending ? "Зберігаємо…" : "Зберегти"}
        </Button>
        <PageResetButton slug={slug} disabled={isDefault || pending} onReset={onReset} />

        <div className="flex min-w-0 flex-col gap-1">
          <p role="status" className={cn(STATUS_LINE, "text-success empty:hidden")}>
            {showNotice && (
              <>
                <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {notice === "saved" ? "Збережено. Сторінка на сайті оновилася." : "Повернено стандартний текст."}
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
