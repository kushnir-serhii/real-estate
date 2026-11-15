import { z } from "zod";

import { propertyFiltersSchema, ROOM_OPTIONS } from "@/lib/db/properties";
import type { PropertyFilters } from "@/lib/db/properties";
import { CURRENCIES, DEALS, PROP_KINDS, PROP_KINDS_BY_PROPERTY, PROPERTY_TYPES } from "@/lib/db/property-values";
import type { ExchangeRates } from "@/lib/db/settings";

const shape = propertyFiltersSchema.shape;

export type Deal = NonNullable<PropertyFilters["deal"]>;
export type PropertyType = NonNullable<PropertyFilters["property_type"]>;
export type PropKind = NonNullable<PropertyFilters["prop_kind"]>[number];
export type Room = NonNullable<PropertyFilters["rooms"]>[number];
export type Sort = PropertyFilters["sort"];
export type Currency = (typeof CURRENCIES)[number];

export type SearchParams = Record<string, string | string[] | undefined>;

/** What the visitor asked for, cleaned: drives the form, links, title and metadata. */
export type CatalogState = {
  deal?: Deal;
  property_type?: PropertyType;
  prop_kind?: PropKind;
  rooms: Room[];
  currency: Currency;
  /** In `currency`, as typed by the visitor. */
  price_from?: number;
  price_to?: number;
  area_from?: number;
  area_to?: number;
  district?: string;
  sort: Sort;
  page: number;
};

/** Types where the rooms filter makes sense (plots have no rooms). */
export const typeHasRooms = (type: PropertyType | undefined) => type !== "plot";
/** The area filter works on `area_total`, which plots don't have (their size is `area_lot`). */
export const typeHasArea = (type: PropertyType | undefined) => type !== "plot";

const values = (v: string | string[] | undefined): string[] =>
  (Array.isArray(v) ? v : v === undefined ? [] : [v])
    .flatMap((p) => p.split(","))
    .map((p) => p.trim())
    .filter((p) => p !== "");

const first = (v: string | string[] | undefined): string | undefined => values(v)[0];

const pick = <T extends z.ZodType>(schema: T, v: unknown): z.output<T> | undefined => {
  const result = schema.safeParse(v);
  return result.success ? result.data : undefined;
};

const currencySchema = z.enum(CURRENCIES);

/** Non-negative finite number or undefined; "", text, negatives are ignored. */
const amount = (v: string | string[] | undefined): number | undefined => {
  const raw = first(v);
  if (raw === undefined) return undefined;
  const n = Number(raw.replace(/\s/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

const ordered = (from: number | undefined, to: number | undefined) =>
  from !== undefined && to !== undefined && from > to ? { from: to, to: from } : { from, to };

/** URL searchParams → cleaned state. Unknown or invalid values are dropped, never an error. */
export const parseCatalogState = (params: SearchParams): CatalogState => {
  const deal = pick(shape.deal, first(params.deal));
  const property_type = pick(shape.property_type, first(params.property_type));

  const kindCandidate = first(params.prop_kind);
  const prop_kind =
    property_type && kindCandidate
      ? (PROP_KINDS_BY_PROPERTY[property_type] as readonly string[]).includes(kindCandidate)
        ? pick(shape.prop_kind, [kindCandidate])?.[0]
        : undefined
      : undefined;

  const rooms = typeHasRooms(property_type)
    ? [...new Set(values(params.rooms).flatMap((r) => pick(shape.rooms, [r]) ?? []))].sort()
    : [];

  const currency = pick(currencySchema, first(params.currency)) ?? "USD";
  const price = ordered(amount(params.price_from), amount(params.price_to));
  const area = typeHasArea(property_type)
    ? ordered(amount(params.area_from), amount(params.area_to))
    : { from: undefined, to: undefined };

  const district = first(params.district);

  return {
    deal,
    property_type,
    prop_kind,
    rooms,
    currency,
    price_from: price.from,
    price_to: price.to,
    area_from: area.from,
    area_to: area.to,
    district: district && district.length <= 100 ? district : undefined,
    sort: pick(shape.sort, first(params.sort)) ?? "newest",
    page: pick(shape.page, first(params.page)) ?? 1,
  };
};

/** Visitor's amount → USD (`rates` are units per 1 USD). Bounds widen when rounding. */
const toUsd = (value: number | undefined, currency: Currency, rates: ExchangeRates, round: (n: number) => number) =>
  value === undefined ? undefined : round(value / (currency === "USD" ? 1 : rates[currency]));

/** Cleaned state → data-layer filters (`price_usd_*`), validated by `propertyFiltersSchema`. */
export const toPropertyFilters = (state: CatalogState, rates: ExchangeRates): PropertyFilters =>
  propertyFiltersSchema.parse({
    deal: state.deal,
    property_type: state.property_type,
    prop_kind: state.prop_kind ? [state.prop_kind] : undefined,
    rooms: state.rooms.length ? state.rooms : undefined,
    price_usd_from: toUsd(state.price_from, state.currency, rates, Math.floor),
    price_usd_to: toUsd(state.price_to, state.currency, rates, Math.ceil),
    area_from: state.area_from,
    area_to: state.area_to,
    district: state.district ? [state.district] : undefined,
    sort: state.sort,
    page: state.page,
  });

/** Number of filter groups set (shown on the mobile «Фільтри (N)» button). */
export const countActiveFilters = (s: CatalogState): number =>
  [
    s.deal,
    s.property_type,
    s.prop_kind,
    s.rooms.length ? s.rooms : undefined,
    s.price_from ?? s.price_to,
    s.area_from ?? s.area_to,
    s.district,
  ].filter((v) => v !== undefined).length;

/** Canonical query string for a state; defaults are left out (page 1, newest, currency without price). */
export const catalogQuery = (s: CatalogState): string => {
  const q = new URLSearchParams();
  if (s.deal) q.set("deal", s.deal);
  if (s.property_type) q.set("property_type", s.property_type);
  if (s.prop_kind) q.set("prop_kind", s.prop_kind);
  for (const r of s.rooms) q.append("rooms", r);
  if (s.price_from !== undefined) q.set("price_from", String(s.price_from));
  if (s.price_to !== undefined) q.set("price_to", String(s.price_to));
  if (s.price_from !== undefined || s.price_to !== undefined) q.set("currency", s.currency);
  if (s.area_from !== undefined) q.set("area_from", String(s.area_from));
  if (s.area_to !== undefined) q.set("area_to", String(s.area_to));
  if (s.district) q.set("district", s.district);
  if (s.sort !== "newest") q.set("sort", s.sort);
  if (s.page > 1) q.set("page", String(s.page));
  return q.toString();
};

export const catalogHref = (s: CatalogState, patch: Partial<CatalogState> = {}): string => {
  const query = catalogQuery({ ...s, ...patch });
  return query ? `/catalog?${query}` : "/catalog";
};

/** «Скинути»: keeps the deal (the section the visitor came from) unless that's all that's set. */
export const resetHref = (s: CatalogState): string => {
  const onlyDeal = countActiveFilters(s) === (s.deal ? 1 : 0);
  return s.deal && !onlyDeal ? `/catalog?deal=${s.deal}` : "/catalog";
};

const TYPE_PLURAL: Record<PropertyType, { title: string; genitive: string }> = {
  flat: { title: "Квартири", genitive: "квартир" },
  house: { title: "Будинки", genitive: "будинків" },
  commercial: { title: "Комерційна нерухомість", genitive: "комерційної нерухомості" },
  plot: { title: "Ділянки", genitive: "ділянок" },
};

const DEAL_TITLE: Record<Deal, string> = {
  sell: "Продаж",
  rent_long: "Оренда",
  rent_day: "Подобова оренда",
};

/** «Продаж квартир», «Оренда нерухомості», «Ділянки», «Усі об'єкти». */
export const catalogTitle = (s: Pick<CatalogState, "deal" | "property_type">): string => {
  if (s.deal) {
    return `${DEAL_TITLE[s.deal]} ${s.property_type ? TYPE_PLURAL[s.property_type].genitive : "нерухомості"}`;
  }
  return s.property_type ? TYPE_PLURAL[s.property_type].title : "Усі об'єкти";
};

/** Only the plain catalog and the deal sections are indexed; filtered/sorted/paged views are not (landings: 009). */
export const isIndexable = (s: CatalogState): boolean =>
  countActiveFilters(s) === (s.deal ? 1 : 0) && s.sort === "newest" && s.page === 1;

export const canonicalPath = (s: CatalogState): string =>
  isIndexable(s) && s.deal ? `/catalog?deal=${s.deal}` : "/catalog";

export { objectsLabel } from "./objects-label";

const strictNumber = z.preprocess(
  (v) => (v === undefined ? undefined : typeof v === "string" && v.trim() !== "" ? Number(v.replace(/\s/g, "")) : NaN),
  z.number().finite().nonnegative().optional(),
);

/** Same filters as the catalog URL, but a bad value is an error (for the API), not silently dropped. Price params are not checked: the histogram ignores them. */
const strictParamsSchema = z.object({
  deal: z.enum(DEALS).optional(),
  property_type: z.enum(PROPERTY_TYPES).optional(),
  prop_kind: z.array(z.enum(PROP_KINDS)).optional(),
  rooms: z.array(z.enum(ROOM_OPTIONS)).optional(),
  currency: currencySchema.optional(),
  area_from: strictNumber,
  area_to: strictNumber,
  district: z.array(z.string().min(1).max(100)).optional(),
});

/**
 * Validates the catalog params of `/api/price-histogram`: `ok: false` on any bad value, otherwise the cleaned
 * state (price bounds dropped: the histogram shows the range around the selection, never narrowed by it).
 * Empty values (`rooms=`) count as absent, like in the catalog form.
 */
export const parseHistogramParams = (params: SearchParams): { ok: true; state: CatalogState } | { ok: false } => {
  const list = (v: string | string[] | undefined) => {
    const items = values(v);
    return items.length ? items : undefined;
  };
  const checked = strictParamsSchema.safeParse({
    deal: first(params.deal),
    property_type: first(params.property_type),
    prop_kind: list(params.prop_kind),
    rooms: list(params.rooms),
    currency: first(params.currency),
    area_from: first(params.area_from),
    area_to: first(params.area_to),
    district: list(params.district),
  });
  if (!checked.success) return { ok: false };
  const state = parseCatalogState({ ...params, price_from: undefined, price_to: undefined });
  return { ok: true, state };
};
