"use client";

import { CircleAlert, CircleCheck, LoaderCircle, Save, TriangleAlert, WandSparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SELECT_CLASS } from "@/features/catalog/catalog-labels";
import {
  DEAL_LABELS,
  HOUSING_CLASS_LABELS,
  PROP_KIND_LABELS,
  PROPERTY_TYPE_LABELS,
  REPAIR_LABELS,
  WALL_MATERIAL_LABELS,
  labelOf,
} from "@/features/properties/property-labels";
import { CURRENCIES, DEALS, HOUSING_CLASSES, PROPERTY_TYPES, REPAIRS, WALL_MATERIALS } from "@/lib/db/property-values";
import { buildPropertyTitle } from "@/lib/sync/property-title";
import { cn } from "@/lib/utils";
import { saveProperty } from "./actions";
import { PropertyField, fieldDescribedBy } from "./property-field";
import { PROPERTY_FORM_FIELDS, PROPERTY_LIMITS } from "./property-form-schema";
import type { PropertyFormErrors, PropertyFormField, PropertyFormRaw, PublishRequirement } from "./property-form-schema";
import { PropertyFormSection } from "./property-form-section";
import { INITIAL_PROPERTY_FORM_STATE, geocodeWarning } from "./property-form-state";
import type { PropertyFormState } from "./property-form-state";
import {
  DETAIL_FIELDS,
  SEO_FIELDS,
  propKindsOf,
  propertyFieldId,
  relevantDetailFields,
  sameFormValues,
  titleInputOf,
  toPropertyType,
} from "./property-form-values";
import type { AgentOption, DetailField } from "./property-form-values";
import { propertyHref } from "./properties-params";

type PropertyFormProps = {
  /** null: a new draft. */
  propertyId: string | null;
  initialValues: PropertyFormRaw;
  agents: readonly AgentOption[];
  /** `plektan` mode: only the SEO fields are editable (the rest is disabled and not posted). */
  seoOnly: boolean;
  /** Address on the site; null before the first save. */
  slug: { value: string; frozen: boolean } | null;
  /** What the last publish attempt reported missing (marked until filled in). */
  publishMissing: readonly PublishRequirement[];
  /** Just created (redirect from «new»): say so once, with the geocoding warning if any. */
  createdNotice: { geocodeWarning: string | null } | null;
  onDirtyChange?: (dirty: boolean) => void;
};

type Option = { value: string; label: string };

const optionsOf = <K extends string>(values: readonly K[], labels: Record<K, string>): Option[] =>
  values.map((value) => ({ value, label: labels[value] }));

const DEAL_OPTIONS = optionsOf(DEALS, DEAL_LABELS);
const TYPE_OPTIONS = optionsOf(PROPERTY_TYPES, PROPERTY_TYPE_LABELS);
const REPAIR_OPTIONS = optionsOf(REPAIRS, REPAIR_LABELS);
const WALL_OPTIONS = optionsOf(WALL_MATERIALS, WALL_MATERIAL_LABELS);
const CLASS_OPTIONS = optionsOf(HOUSING_CLASSES, HOUSING_CLASS_LABELS);
const CURRENCY_OPTIONS: Option[] = CURRENCIES.map((value) => ({ value, label: value }));

/** `text` where a minus is needed: the iOS numeric keypad has none. */
type NumberMode = "numeric" | "decimal" | "text";

const NUMBER_FIELDS: Partial<Record<PropertyFormField, NumberMode>> = {
  price_amount: "numeric",
  area_total: "decimal",
  area_life: "decimal",
  area_kitchen: "decimal",
  area_lot: "decimal",
  room_count: "numeric",
  storey: "text", // basement floors are negative
  storeys: "numeric",
};

const DETAIL_LABELS: Record<DetailField, string> = {
  area_total: "Загальна площа, м²",
  area_life: "Житлова площа, м²",
  area_kitchen: "Площа кухні, м²",
  area_lot: "Площа ділянки, соток",
  room_count: "Кімнат",
  storey: "Поверх",
  storeys: "Поверхів у будинку",
  repair: "Ремонт",
  wall_material: "Матеріал стін",
  housing_class: "Клас житла",
  is_newbuilding: "Новобудова",
};

const DETAIL_OPTIONS: Partial<Record<DetailField, Option[]>> = {
  repair: REPAIR_OPTIONS,
  wall_material: WALL_OPTIONS,
  housing_class: CLASS_OPTIONS,
};

const counterTone = (length: number, max: number) =>
  length > max ? "font-medium text-destructive" : "text-muted-foreground";

const STATUS_LINE = "flex items-start gap-1.5 text-sm font-medium wrap-anywhere";

/**
 * The property create / edit form. Controlled inputs (React resets uncontrolled forms after an action,
 * which would drop what was typed); inline errors, the first invalid field gets the focus; a sticky save bar.
 */
export const PropertyForm = ({
  propertyId,
  initialValues,
  agents,
  seoOnly,
  slug,
  publishMissing,
  createdNotice,
  onDirtyChange,
}: PropertyFormProps) => {
  const router = useRouter();
  const [values, setValues] = useState<PropertyFormRaw>(initialValues);
  const [baseline, setBaseline] = useState<PropertyFormRaw>(initialValues);
  // Kept in state: the page drops `?geocode=` from the URL right away, which clears the prop.
  const [created] = useState(createdNotice);
  const [geocodeNote, setGeocodeNote] = useState<string | null>(createdNotice?.geocodeWarning ?? null);
  const [titleNote, setTitleNote] = useState<string | null>(null);
  const valuesRef = useRef(values);
  const statusRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  const [state, formAction, pending] = useActionState(
    async (prev: PropertyFormState, formData: FormData): Promise<PropertyFormState> => {
      const submitted = valuesRef.current;
      const next = await saveProperty(prev, formData);
      switch (next.status) {
        case "created":
          setBaseline(submitted);
          router.replace(`${propertyHref(next.id)}?geocode=${next.geocode}`);
          break;
        case "saved":
          setBaseline(submitted);
          setGeocodeNote(geocodeWarning(next.geocode));
          break;
        case "seo_saved":
          setBaseline(submitted);
          break;
        case "idle":
        case "invalid":
        case "error":
          break;
        default: {
          const unreachable: never = next;
          return unreachable;
        }
      }
      return next;
    },
    INITIAL_PROPERTY_FORM_STATE,
  );

  const dirty = !sameFormValues(values, baseline);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  // Leaving the page with unsaved changes asks the browser's «leave the site?» first.
  useEffect(() => {
    if (!dirty || state.status === "created") return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, state.status]);

  // Just created: the status line says so; move the focus there so it is read out.
  useEffect(() => {
    if (created) statusRef.current?.focus();
  }, [created]);

  const saveErrors: PropertyFormErrors = state.status === "invalid" ? state.errors : {};

  // Move the focus to the first field to fix (fields are listed in the order of the form).
  useEffect(() => {
    if (state.status !== "invalid") return;
    const first = PROPERTY_FORM_FIELDS.find((field) => state.errors[field]);
    if (first) document.getElementById(propertyFieldId(first))?.focus();
  }, [state]);

  // Publish errors stay until the field is filled in.
  const errors: PropertyFormErrors = { ...saveErrors };
  for (const item of publishMissing) {
    if (errors[item.field] === undefined && values[item.field].trim() === "") errors[item.field] = item.message;
  }

  const type = toPropertyType(values.property_type);
  const kinds = propKindsOf(type);
  const relevant = relevantDetailFields(type);

  const set = (field: PropertyFormField, value: string) => setValues((v) => ({ ...v, [field]: value }));

  // A new type: the kind must belong to it, and parameters the type doesn't use are cleared
  // (a plot with «5th floor» would show on the site).
  const changeType = (next: string) =>
    setValues((v) => {
      const nextType = toPropertyType(next);
      const keep = relevantDetailFields(nextType);
      const cleared = Object.fromEntries(DETAIL_FIELDS.filter((f) => !keep.includes(f)).map((f) => [f, ""]));
      return {
        ...v,
        ...cleared,
        property_type: next,
        prop_kind: propKindsOf(nextType).includes(v.prop_kind) ? v.prop_kind : "",
      };
    });

  const suggestTitle = () => {
    const input = titleInputOf(values);
    if (input === null) {
      setTitleNote("Спершу оберіть тип об'єкта — назва складається з типу, площі й району.");
      return;
    }
    setTitleNote(null);
    set("title", buildPropertyTitle(input));
  };

  const isDisabled = (field: PropertyFormField) => seoOnly && !SEO_FIELDS.includes(field);

  /** id, name, disabled and the a11y wiring shared by every control. */
  const controlProps = (field: PropertyFormField, hasHint: boolean) => {
    const id = propertyFieldId(field);
    return {
      id,
      name: field,
      disabled: isDisabled(field),
      "aria-invalid": errors[field] ? true : undefined,
      "aria-describedby": fieldDescribedBy(id, hasHint, errors[field]),
    };
  };

  const textField = (
    field: PropertyFormField,
    label: string,
    options: { hint?: React.ReactNode; className?: string; autoComplete?: string } = {},
  ) => {
    const numberMode = NUMBER_FIELDS[field];
    return (
      <PropertyField
        id={propertyFieldId(field)}
        label={label}
        hint={options.hint}
        error={errors[field]}
        className={options.className}
      >
        <Input
          {...controlProps(field, Boolean(options.hint))}
          inputMode={numberMode}
          autoComplete={options.autoComplete ?? "off"}
          value={values[field]}
          // Numbers: «1 200 000» is typed with spaces; the schema wants digits.
          onChange={(e) => set(field, numberMode ? e.target.value.replace(/\s+/g, "") : e.target.value)}
          className={cn(numberMode && "tabular-nums")}
        />
      </PropertyField>
    );
  };

  const selectField = (
    field: PropertyFormField,
    label: string,
    options: readonly Option[],
    config: { empty: string; hint?: React.ReactNode; onChange?: (value: string) => void; disabled?: boolean },
  ) => {
    const current = values[field];
    // A stored value outside the list (e.g. a new Plektan value) stays visible instead of jumping to the first option.
    const unknown = current !== "" && !options.some((o) => o.value === current);
    const props = controlProps(field, Boolean(config.hint));
    return (
      <PropertyField id={props.id} label={label} hint={config.hint} error={errors[field]}>
        <select
          {...props}
          disabled={props.disabled || config.disabled}
          value={current}
          onChange={(e) => (config.onChange ?? ((v: string) => set(field, v)))(e.target.value)}
          className={cn(
            SELECT_CLASS,
            "disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
          )}
        >
          <option value="">{config.empty}</option>
          {unknown && <option value={current}>{current}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </PropertyField>
    );
  };

  const detailField = (field: DetailField) => {
    const visible = relevant.includes(field) || errors[field] !== undefined;
    if (!visible) {
      // Not used by this type; saved as it is (empty after a type change). Disabled controls aren't posted anyway.
      if (seoOnly || values[field] === "") return null;
      return <input key={field} type="hidden" name={field} value={values[field]} />;
    }
    if (field === "is_newbuilding") {
      const id = propertyFieldId(field);
      return (
        <div key={field} className="flex min-w-0 flex-col justify-end">
          <label
            htmlFor={id}
            className={cn(
              "flex min-h-11 items-center gap-3 text-sm font-medium",
              isDisabled(field) && "cursor-not-allowed opacity-50",
            )}
          >
            <input
              id={id}
              type="checkbox"
              name={field}
              disabled={isDisabled(field)}
              checked={values[field] === "on"}
              onChange={(e) => set(field, e.target.checked ? "on" : "")}
              className="size-5 shrink-0 accent-primary"
            />
            {DETAIL_LABELS[field]}
          </label>
        </div>
      );
    }
    const options = DETAIL_OPTIONS[field];
    if (options) {
      return <div key={field}>{selectField(field, DETAIL_LABELS[field], options, { empty: "Не вказано" })}</div>;
    }
    const hint = field === "area_lot" ? "1 сотка = 100 м²" : undefined;
    return <div key={field}>{textField(field, DETAIL_LABELS[field], { hint })}</div>;
  };

  const kindOptions = kinds.map((kind) => ({ value: kind, label: labelOf(PROP_KIND_LABELS, kind) ?? kind }));
  const agentOptions = agents.map((a) => ({ value: a.id, label: a.inactive ? `${a.name} (вже не працює)` : a.name }));

  const seoCounter = (field: "seo_title" | "seo_description", max: number, auto: string) => {
    const length = values[field].trim().length;
    return (
      <>
        <span className={cn("tabular-nums", counterTone(length, max))}>
          {length} з {max} символів.
        </span>{" "}
        {auto}
      </>
    );
  };

  const titleLength = values.title.trim().length;

  // ---- the save result ----
  const showResult = !pending && !dirty;
  let success: React.ReactNode = null;
  switch (state.status) {
    case "created":
      success = "Чернетку створено. Відкриваємо її…";
      break;
    case "saved":
      success = state.slugChanged ? `Збережено. Адреса сторінки тепер /catalog/${state.slug}` : "Збережено.";
      break;
    case "seo_saved":
      success = "SEO збережено.";
      break;
    case "idle":
      success = created ? "Чернетку створено. Додайте деталі й опублікуйте, коли все готово." : null;
      break;
    case "invalid":
    case "error":
      break;
    default: {
      const unreachable: never = state;
      success = unreachable;
    }
  }
  const showGeocode = state.status === "saved" || (state.status === "idle" && created !== null);

  // Submitted by hand, not via `action`: React resets a form after an action, and a reset puts controlled
  // <select>s back to their first option on screen (the next save would post those).
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  };

  const saveLabel = seoOnly ? "Зберегти SEO" : propertyId === null ? "Створити чернетку" : "Зберегти";

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-w-0 flex-col gap-6">
      {propertyId !== null && <input type="hidden" name="id" value={propertyId} />}

      <PropertyFormSection id="basics" title="Основне">
        <div className="grid gap-4 sm:grid-cols-2">
          {selectField("deal", "Угода", DEAL_OPTIONS, { empty: "Оберіть угоду" })}
          {selectField("property_type", "Тип об'єкта", TYPE_OPTIONS, { empty: "Оберіть тип", onChange: changeType })}
          {selectField("prop_kind", "Вид", kindOptions, {
            empty: "Не вказано",
            disabled: type === null,
            hint: type === null ? "Спершу оберіть тип об'єкта" : undefined,
          })}
        </div>

        <PropertyField
          id={propertyFieldId("title")}
          label="Назва"
          error={errors.title}
          hint={
            <>
              <span className={cn("tabular-nums", counterTone(titleLength, PROPERTY_LIMITS.title))}>
                {titleLength} з {PROPERTY_LIMITS.title} символів.
              </span>{" "}
              Так оголошення називається в каталозі. «Підставити з параметрів» складе назву з типу, площі й району.
            </>
          }
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              {...controlProps("title", true)}
              autoComplete="off"
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
              className="sm:flex-1"
            />
            {!seoOnly && (
              <Button type="button" variant="outline" onClick={suggestTitle} className="sm:shrink-0">
                <WandSparkles aria-hidden="true" />
                Підставити з параметрів
              </Button>
            )}
          </div>
          <p role="status" className={cn(STATUS_LINE, "text-warning empty:hidden")}>
            {titleNote}
          </p>
        </PropertyField>

        <div className="flex flex-col gap-1 text-sm">
          <p className="wrap-anywhere">
            <span className="text-muted-foreground">Адреса сторінки: </span>
            {slug ? <span className="font-medium">/catalog/{slug.value}</span> : <span>з&apos;явиться після збереження</span>}
          </p>
          <p className="text-muted-foreground">
            {slug === null
              ? "Складається з назви."
              : slug.frozen
                ? "Не змінюється після першої публікації: на неї вже можуть вести посилання й пошук."
                : "Оновлюється з назви до першої публікації."}
          </p>
        </div>
      </PropertyFormSection>

      <PropertyFormSection id="price" title="Ціна">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,7rem)] items-start gap-3 sm:max-w-md">
          {textField("price_amount", "Ціна", { hint: "Порожня ціна — на сайті буде «Ціна за запитом»." })}
          {selectField("currency", "Валюта", CURRENCY_OPTIONS, { empty: "—" })}
        </div>
      </PropertyFormSection>

      <PropertyFormSection
        id="details"
        title="Площа і параметри"
        description={type === null ? "Оберіть тип об'єкта — лишаться тільки потрібні поля." : undefined}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{DETAIL_FIELDS.map(detailField)}</div>
      </PropertyFormSection>

      <PropertyFormSection id="address" title="Адреса">
        <div className="grid gap-4 sm:grid-cols-2">
          {textField("locality", "Населений пункт", { autoComplete: "off" })}
          {textField("district", "Район")}
          {textField("street", "Вулиця")}
          {textField("house", "Будинок", { hint: "Не показується на сайті — лише для карти й для вас." })}
        </div>
        {geocodeNote && (
          <p className={cn(STATUS_LINE, "text-warning")}>
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {geocodeNote}
          </p>
        )}
      </PropertyFormSection>

      <PropertyFormSection id="description" title="Опис">
        <PropertyField
          id={propertyFieldId("description")}
          label="Текст оголошення"
          error={errors.description}
          hint="Простий текст без форматування; абзаци зберігаються."
        >
          <Textarea
            {...controlProps("description", true)}
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            className="min-h-40"
          />
        </PropertyField>
      </PropertyFormSection>

      <PropertyFormSection id="agent" title="Агент">
        <div className="sm:max-w-md">
          {selectField("agent_id", "Хто веде об'єкт", agentOptions, {
            empty: "Без агента",
            hint: "Його ім'я й телефон показуються на сторінці об'єкта.",
          })}
        </div>
      </PropertyFormSection>

      <PropertyFormSection
        id="seo"
        title="SEO"
        description="Як сторінка виглядає в Google. Можна не заповнювати — тоді підставиться назва й початок опису."
      >
        <PropertyField
          id={propertyFieldId("seo_title")}
          label="SEO-заголовок"
          error={errors.seo_title}
          hint={seoCounter("seo_title", PROPERTY_LIMITS.seoTitle, "Порожньо — заголовок складеться автоматично.")}
        >
          <Input
            {...controlProps("seo_title", true)}
            autoComplete="off"
            value={values.seo_title}
            onChange={(e) => set("seo_title", e.target.value)}
          />
        </PropertyField>
        <PropertyField
          id={propertyFieldId("seo_description")}
          label="SEO-опис"
          error={errors.seo_description}
          hint={seoCounter("seo_description", PROPERTY_LIMITS.seoDescription, "Порожньо — опис складеться автоматично.")}
        >
          <Textarea
            {...controlProps("seo_description", true)}
            value={values.seo_description}
            onChange={(e) => set("seo_description", e.target.value)}
            className="min-h-24"
          />
        </PropertyField>
      </PropertyFormSection>

      <div className="sticky bottom-0 z-10 -mx-4 flex lg:mx-0 lg:px-0 flex-col gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:gap-4">
        <Button type="submit" disabled={pending || state.status === "created"} className="w-full sm:w-auto">
          {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
          {pending ? "Зберігаємо…" : saveLabel}
        </Button>

        <div className="flex min-w-0 flex-col gap-1">
          <p
            ref={statusRef}
            role="status"
            tabIndex={-1}
            className="flex flex-col gap-1 text-sm font-medium wrap-anywhere outline-none empty:hidden"
          >
            {pending
              ? null
              : showResult &&
                success && (
                  <span className="flex items-start gap-1.5 text-success">
                    <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {success}
                  </span>
                )}
            {showResult && showGeocode && geocodeNote && (
              <span className="flex items-start gap-1.5 text-warning">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {geocodeNote}
              </span>
            )}
          </p>

          {!pending && (state.status === "error" || state.status === "invalid") && (
            <p role="alert" className={cn(STATUS_LINE, "text-destructive")}>
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {state.status === "error" ? state.message : "Не збережено: виправте позначені поля."}
            </p>
          )}

          {!pending && dirty && state.status !== "created" && (
            <p className="text-sm text-muted-foreground">Є незбережені зміни</p>
          )}
        </div>
      </div>
    </form>
  );
};
