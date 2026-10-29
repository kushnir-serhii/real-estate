import { z } from "zod";
import {
  CURRENCIES,
  DEALS,
  HOUSING_CLASSES,
  PROP_KINDS_BY_PROPERTY,
  PROPERTY_TYPES,
  REPAIRS,
  WALL_MATERIALS,
} from "@/lib/db/property-values";

/**
 * Admin property form: one schema for the browser and the server (no server-only imports).
 * The form posts plain strings (`FormData`); the schema trims them, turns empty strings into null,
 * accepts comma decimals and reports one Ukrainian message per field.
 */

export const PROPERTY_FORM_FIELDS = [
  "deal",
  "property_type",
  "prop_kind",
  "title",
  "price_amount",
  "currency",
  "area_total",
  "area_life",
  "area_kitchen",
  "area_lot",
  "room_count",
  "storey",
  "storeys",
  "repair",
  "wall_material",
  "housing_class",
  "is_newbuilding",
  "locality",
  "district",
  "street",
  "house",
  "description",
  "agent_id",
  "seo_title",
  "seo_description",
] as const;

export type PropertyFormField = (typeof PROPERTY_FORM_FIELDS)[number];

/** What the form holds as text: every field name -> the string the user typed / chose ("" = empty). */
export type PropertyFormRaw = Record<PropertyFormField, string>;

export type PropertyFormErrors = Partial<Record<PropertyFormField, string>>;

export const PROPERTY_LIMITS = {
  title: 200,
  address: 120,
  description: 10_000,
  seoTitle: 120,
  seoDescription: 300,
  maxPrice: 1_000_000_000_000,
  maxArea: 1_000_000,
  maxRooms: 100,
  minStorey: -5,
  maxStorey: 200,
} as const;

const TRUE_VALUES = new Set(["on", "true", "1", "yes"]);

const issue = (ctx: z.core.$RefinementCtx<string>, message: string): typeof z.NEVER => {
  ctx.issues.push({ code: "custom", message, input: ctx.value });
  return z.NEVER;
};

const textField = (label: string, max: number) =>
  z
    .string()
    .trim()
    .transform((value, ctx): string | null => {
      if (value === "") return null;
      if (value.length > max) return issue(ctx, `${label}: не більше ${max} символів`);
      return value;
    });

const addressField = (label: string) => textField(label, PROPERTY_LIMITS.address);

type NumberRule = { label: string; min: number; max: number; integer: boolean };

const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;

const numberField = ({ label, min, max, integer }: NumberRule) =>
  z
    .string()
    .trim()
    .transform((value, ctx): number | null => {
      if (value === "") return null;
      // «1 200 000» (`\s` also covers no-break and narrow spaces) and comma decimals are accepted.
      const text = value.replace(/\s+/g, "").replace(",", ".");
      if (!NUMBER_PATTERN.test(text)) {
        return issue(ctx, integer ? `${label}: введіть ціле число` : `${label}: введіть число, наприклад 54,5`);
      }
      const parsed = Number(text);
      if (integer && !Number.isInteger(parsed)) return issue(ctx, `${label}: введіть ціле число`);
      if (!integer && !/^-?\d+(\.\d{1,2})?$/.test(text)) return issue(ctx, `${label}: не більше двох знаків після коми`);
      if (parsed < min) {
        return issue(ctx, min === 0 ? `${label}: не може бути від’ємним` : `${label}: не менше ${min}`);
      }
      if (parsed > max) return issue(ctx, `${label}: не більше ${max.toLocaleString("uk-UA")}`);
      return parsed;
    });

const area = (label: string) => numberField({ label, min: 0, max: PROPERTY_LIMITS.maxArea, integer: false });

const listField = <T extends string>(label: string, values: readonly T[]) =>
  z
    .string()
    .trim()
    .transform((value, ctx): T | null => {
      if (value === "") return null;
      const found = values.find((candidate) => candidate === value);
      return found ?? issue(ctx, `${label}: оберіть значення зі списку`);
    });

const requiredList = <T extends string>(label: string, values: readonly T[]) =>
  z
    .string()
    .trim()
    .transform((value, ctx): T => {
      const found = values.find((candidate) => candidate === value);
      return found ?? issue(ctx, value === "" ? `${label}: оберіть значення` : `${label}: оберіть значення зі списку`);
    });

const UUID_SCHEMA = z.uuid();

const boolField = z
  .string()
  .trim()
  .transform((value) => TRUE_VALUES.has(value.toLowerCase()));

const title = z
  .string()
  .trim()
  .transform((value, ctx): string => {
    if (value === "") return issue(ctx, "Вкажіть назву об’єкта");
    if (value.length > PROPERTY_LIMITS.title) return issue(ctx, `Назва: не більше ${PROPERTY_LIMITS.title} символів`);
    return value;
  });

const agentId = z
  .string()
  .trim()
  .transform((value, ctx): string | null => {
    if (value === "") return null;
    return UUID_SCHEMA.safeParse(value).success ? value : issue(ctx, "Агент: оберіть значення зі списку");
  });

const seoFields = {
  seo_title: textField("SEO-заголовок", PROPERTY_LIMITS.seoTitle),
  seo_description: textField("SEO-опис", PROPERTY_LIMITS.seoDescription),
};

const propertyShape = {
  deal: requiredList("Угода", DEALS),
  property_type: requiredList("Тип об’єкта", PROPERTY_TYPES),
  prop_kind: textField("Вид", 60),
  title,
  price_amount: numberField({ label: "Ціна", min: 0, max: PROPERTY_LIMITS.maxPrice, integer: true }),
  currency: listField("Валюта", CURRENCIES),
  area_total: area("Загальна площа"),
  area_life: area("Житлова площа"),
  area_kitchen: area("Площа кухні"),
  area_lot: area("Площа ділянки"),
  room_count: numberField({ label: "Кімнат", min: 0, max: PROPERTY_LIMITS.maxRooms, integer: true }),
  storey: numberField({ label: "Поверх", min: PROPERTY_LIMITS.minStorey, max: PROPERTY_LIMITS.maxStorey, integer: true }),
  storeys: numberField({ label: "Поверхів у будинку", min: 1, max: PROPERTY_LIMITS.maxStorey, integer: true }),
  repair: listField("Ремонт", REPAIRS),
  wall_material: listField("Матеріал стін", WALL_MATERIALS),
  housing_class: listField("Клас житла", HOUSING_CLASSES),
  is_newbuilding: boolField,
  locality: addressField("Населений пункт"),
  district: addressField("Район"),
  street: addressField("Вулиця"),
  house: addressField("Будинок"),
  description: textField("Опис", PROPERTY_LIMITS.description),
  agent_id: agentId,
  ...seoFields,
} satisfies Record<PropertyFormField, z.ZodType>;

export const propertyFormSchema = z.object(propertyShape).superRefine((values, ctx) => {
  const kinds: readonly string[] = PROP_KINDS_BY_PROPERTY[values.property_type];
  if (values.prop_kind !== null && !kinds.includes(values.prop_kind)) {
    ctx.addIssue({ code: "custom", path: ["prop_kind"], message: "Вид: не підходить до цього типу об’єкта" });
  }
  if (values.price_amount !== null && values.currency === null) {
    ctx.addIssue({ code: "custom", path: ["currency"], message: "Валюта: оберіть, якщо вказана ціна" });
  }
});

/** The text of the form, parsed: numbers are numbers, empty values are null. */
export type PropertyFormValues = z.output<typeof propertyFormSchema>;

/** Plektan mode: only the SEO overrides are editable. */
export const propertySeoSchema = z.object(seoFields);
export type PropertySeoValues = z.output<typeof propertySeoSchema>;

export type PropertyFormResult =
  | { ok: true; values: PropertyFormValues }
  | { ok: false; errors: PropertyFormErrors };

export type PropertySeoResult =
  | { ok: true; values: PropertySeoValues }
  | { ok: false; errors: Pick<PropertyFormErrors, "seo_title" | "seo_description"> };

const isFormField = (value: PropertyKey): value is PropertyFormField =>
  PROPERTY_FORM_FIELDS.some((field) => field === value);

const collectErrors = (issues: readonly z.core.$ZodIssue[]): PropertyFormErrors => {
  const errors: PropertyFormErrors = {};
  for (const item of issues) {
    const field = item.path[0];
    if (field !== undefined && isFormField(field) && errors[field] === undefined) errors[field] = item.message;
  }
  return errors;
};

/** Every form field as text (missing -> ""), so a rejected form can be shown again as typed. */
export const readPropertyFormRaw = (source: { get: (name: string) => unknown }): PropertyFormRaw => {
  // `Object.fromEntries` widens to `Record<string, string>`; the keys are exactly PROPERTY_FORM_FIELDS.
  return Object.fromEntries(
    PROPERTY_FORM_FIELDS.map((field) => {
      const value = source.get(field);
      return [field, typeof value === "string" ? value : ""];
    }),
  ) as PropertyFormRaw;
};

export const parsePropertyFormRaw = (raw: PropertyFormRaw): PropertyFormResult => {
  const parsed = propertyFormSchema.safeParse(raw);
  if (parsed.success) return { ok: true, values: parsed.data };
  return { ok: false, errors: collectErrors(parsed.error.issues) };
};

export const parsePropertyForm = (formData: FormData): PropertyFormResult =>
  parsePropertyFormRaw(readPropertyFormRaw(formData));

export const parsePropertySeoForm = (formData: FormData): PropertySeoResult => {
  const parsed = propertySeoSchema.safeParse(readPropertyFormRaw(formData));
  if (parsed.success) return { ok: true, values: parsed.data };
  return { ok: false, errors: collectErrors(parsed.error.issues) };
};

// ---- publish -------------------------------------------------------------------

export type PublishRequirement = {
  field: "deal" | "property_type" | "locality" | "title";
  message: string;
};

export type PublishCheckInput = {
  deal: string | null;
  property_type: string | null;
  locality: string | null;
  title: string | null;
};

const isFilled = (value: string | null): boolean => value !== null && value.trim() !== "";

/** What is still missing before a property can go live (price is optional: «Ціна за запитом»). */
export const publishRequirements = (values: PublishCheckInput): PublishRequirement[] => {
  const missing: PublishRequirement[] = [];
  if (!isFilled(values.deal)) missing.push({ field: "deal", message: "Оберіть угоду" });
  if (!isFilled(values.property_type)) missing.push({ field: "property_type", message: "Оберіть тип об’єкта" });
  if (!isFilled(values.locality)) missing.push({ field: "locality", message: "Вкажіть населений пункт" });
  if (!isFilled(values.title)) missing.push({ field: "title", message: "Вкажіть назву об’єкта" });
  return missing;
};
