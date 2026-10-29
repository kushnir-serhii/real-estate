import type { AdminProperty } from "@/lib/db/admin-properties";
import { PROP_KINDS_BY_PROPERTY, PROPERTY_TYPES } from "@/lib/db/property-values";
import type { TitleInput } from "@/lib/sync/property-title";
import { PROPERTY_FORM_FIELDS } from "./property-form-schema";
import type { PropertyFormField, PropertyFormRaw } from "./property-form-schema";

/** Pure helpers of the property form (client-safe): initial text values, which fields a type uses. */

export type PropertyType = (typeof PROPERTY_TYPES)[number];

/** The columns the form edits. */
export type PropertyFormSource = Pick<AdminProperty, Exclude<PropertyFormField, "is_newbuilding">> & {
  is_newbuilding: boolean | null;
};

export const SEO_FIELDS: readonly PropertyFormField[] = ["seo_title", "seo_description"];

export const EMPTY_PROPERTY_FORM: PropertyFormRaw = {
  deal: "",
  property_type: "",
  prop_kind: "",
  title: "",
  price_amount: "",
  currency: "USD",
  area_total: "",
  area_life: "",
  area_kitchen: "",
  area_lot: "",
  room_count: "",
  storey: "",
  storeys: "",
  repair: "",
  wall_material: "",
  housing_class: "",
  is_newbuilding: "",
  locality: "",
  district: "",
  street: "",
  house: "",
  description: "",
  agent_id: "",
  seo_title: "",
  seo_description: "",
};

/** 54.5 -> «54,5» (the schema accepts the comma, people type it). */
const numberText = (value: number | null): string => (value === null ? "" : String(value).replace(".", ","));

const text = (value: string | null): string => value ?? "";

export const propertyToFormRaw = (p: PropertyFormSource): PropertyFormRaw => ({
  deal: text(p.deal),
  property_type: text(p.property_type),
  prop_kind: text(p.prop_kind),
  title: text(p.title),
  price_amount: numberText(p.price_amount),
  currency: p.currency ?? "USD",
  area_total: numberText(p.area_total),
  area_life: numberText(p.area_life),
  area_kitchen: numberText(p.area_kitchen),
  area_lot: numberText(p.area_lot),
  room_count: numberText(p.room_count),
  storey: numberText(p.storey),
  storeys: numberText(p.storeys),
  repair: text(p.repair),
  wall_material: text(p.wall_material),
  housing_class: text(p.housing_class),
  is_newbuilding: p.is_newbuilding ? "on" : "",
  locality: text(p.locality),
  district: text(p.district),
  street: text(p.street),
  house: text(p.house),
  description: text(p.description),
  agent_id: text(p.agent_id),
  seo_title: text(p.seo_title),
  seo_description: text(p.seo_description),
});

export const toPropertyType = (value: string): PropertyType | null =>
  PROPERTY_TYPES.find((type) => type === value) ?? null;

export const propKindsOf = (type: PropertyType | null): readonly string[] =>
  type === null ? [] : PROP_KINDS_BY_PROPERTY[type];

export const DETAIL_FIELDS = [
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
] as const satisfies readonly PropertyFormField[];

export type DetailField = (typeof DETAIL_FIELDS)[number];

const without = (...skip: DetailField[]): readonly DetailField[] => DETAIL_FIELDS.filter((f) => !skip.includes(f));

/** Which «Площа і параметри» fields make sense for a type. No type yet: all of them. */
const RELEVANT: Record<PropertyType, readonly DetailField[]> = {
  flat: without("area_lot"),
  house: without("storey", "housing_class", "is_newbuilding"),
  commercial: without("area_life", "area_kitchen", "housing_class", "is_newbuilding"),
  plot: ["area_lot"],
};

export const relevantDetailFields = (type: PropertyType | null): readonly DetailField[] =>
  type === null ? DETAIL_FIELDS : RELEVANT[type];

/** «54,5» -> 54.5; empty or not a number -> null. */
const parseNumber = (value: string): number | null => {
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

/** What `buildPropertyTitle` needs from the current form text; null until a type is chosen. */
export const titleInputOf = (values: PropertyFormRaw): TitleInput | null => {
  const type = toPropertyType(values.property_type);
  if (type === null) return null;
  return {
    property_type: type,
    prop_kind: propKindsOf(type).includes(values.prop_kind) ? values.prop_kind : null,
    room_count: parseNumber(values.room_count),
    area_total: parseNumber(values.area_total),
    area_lot: parseNumber(values.area_lot),
    locality: values.locality.trim() || null,
    district: values.district.trim() || null,
  };
};

/** Same text, ignoring what the server would trim anyway. */
export const sameFormValues = (a: PropertyFormRaw, b: PropertyFormRaw): boolean =>
  PROPERTY_FORM_FIELDS.every((field) => a[field].trim() === b[field].trim());

/** Stable DOM id of a form control (one property form per page); publish errors link to it. */
export const propertyFieldId = (field: PropertyFormField): string => `property-field-${field}`;

/** Agent select option; `inactive`: the current agent no longer works at the agency. */
export type AgentOption = { id: string; name: string; inactive: boolean };
