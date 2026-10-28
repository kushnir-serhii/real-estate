import type { ZodType } from "zod";
import {
  DEALS,
  housingClassSchema,
  PROPERTY_TYPES,
  propKindSchema,
  repairSchema,
  wallMaterialSchema,
} from "@/lib/db/property-values";
import type { ExchangeRates } from "@/lib/db/settings";
import type { PlektanListItem, PlektanViewItem } from "@/lib/plektan";
import type { Json, TablesInsert } from "@/lib/supabase/database.types";
import { htmlToPlainText } from "./html-text";
import { parsePrice } from "./parse-price";
import { buildPropertyTitle } from "./property-title";

export { createSlug } from "./slugify";

/** Columns the mapper decides; the rest (id, slug, status, published_at, agent_id, lat, lng, synced_at, ...) belong to the sync job. */
export type MappedPropertyRow = Omit<
  TablesInsert<"properties">,
  | "id"
  | "slug"
  | "status"
  | "published_at"
  | "agent_id"
  | "lat"
  | "lng"
  | "synced_at"
  | "created_at"
  | "updated_at"
  | "seo_title"
  | "seo_description"
> &
  Required<
    Pick<
      TablesInsert<"properties">,
      | "source"
      | "external_id"
      | "title"
      | "description"
      | "price_amount"
      | "currency"
      | "price_usd"
      | "price_per_m2"
      | "source_updated_at"
      | "raw"
    >
  >;

export type SkipReason = "mls" | "not_actual" | "unsupported";

export type MapPropertyResult =
  | { kind: "skip"; reason: SkipReason }
  | {
      kind: "row";
      row: MappedPropertyRow;
      /** Plektan `user_id` of the property's agent (first of `view.users`), for linking `agent_id`. */
      agentExternalId: string | null;
    };

const orNull = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
};

const toInt = (value: number | null): number | null => (value === null ? null : Math.round(value));

const knownValue = (schema: ZodType<string>, value: string | null): string | null => {
  if (value === null) return null;
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

const KYIV_TIME_ZONE = "Europe/Kyiv";

const kyivOffsetMs = (utcMs: number): number => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: KYIV_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (type: string): number => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
};

/** Plektan dates are Kyiv local time ("2026-10-10 12:00:00"); returns an ISO instant or null. */
export const parseKyivDateTime = (text: string | null): string | null => {
  if (text === null) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(text.trim());
  if (match === null) return null;
  const [, year, month, day, hour = "0", minute = "0", second = "0"] = match;
  const wall = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  // Two passes handle the offset change around DST switches.
  const first = wall - kyivOffsetMs(wall);
  const instant = wall - kyivOffsetMs(first);
  const date = new Date(instant);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

type PriceFields = Pick<MappedPropertyRow, "price_amount" | "currency" | "price_usd" | "price_per_m2">;

const NO_PRICE: PriceFields = { price_amount: null, currency: null, price_usd: null, price_per_m2: null };

const mapPrice = (item: PlektanListItem, areaTotal: number | null, rates: ExchangeRates): PriceFields => {
  const area = areaTotal !== null && areaTotal > 0 ? areaTotal : null;
  const main = parsePrice(item.price.value) ?? parsePrice(item.price.value_obj);
  const perM2Text = parsePrice(item.price.value_m2);

  let amount: number;
  let perM2: number | null = null;

  if (main === null) return NO_PRICE;
  const currency = main.currency;
  if (main.perM2) {
    // The headline price is per m²: the total needs the area.
    if (area === null) return NO_PRICE;
    perM2 = main.amount;
    amount = Math.round(main.amount * area);
  } else {
    amount = main.amount;
  }

  if (perM2 === null) {
    if (perM2Text !== null && perM2Text.currency === currency) perM2 = perM2Text.amount;
    else if (area !== null) perM2 = Math.round(amount / area);
  }

  const rate = currency === "UAH" ? rates.UAH : currency === "EUR" ? rates.EUR : 1;
  return {
    price_amount: amount,
    currency,
    price_usd: Math.round(amount / rate),
    price_per_m2: perM2,
  };
};

/**
 * Plektan item (+ its `view` card, when fetched) -> `properties` row.
 * `is_mls` and non-`actual` items are skipped. Pure: no I/O, no env.
 */
export const mapProperty = (
  item: PlektanListItem,
  view: PlektanViewItem | null,
  rates: ExchangeRates,
): MapPropertyResult => {
  if (item.is_mls) return { kind: "skip", reason: "mls" };
  if (item.state !== "actual") return { kind: "skip", reason: "not_actual" };

  const deal = DEALS.find((value) => value === item.deal);
  const propertyType = PROPERTY_TYPES.find((value) => value === item.property);
  if (deal === undefined || propertyType === undefined) return { kind: "skip", reason: "unsupported" };

  const propKind = knownValue(propKindSchema, item.prop_kind);
  const areaTotal = item.area_total;
  const areaLot = item.area_lot;
  const roomCount = toInt(item.room_count);
  const locality = orNull(item.locality);
  const district = orNull(item.district);

  const row: MappedPropertyRow = {
    source: "plektan",
    external_id: item.adid,
    deal,
    property_type: propertyType,
    prop_kind: propKind,
    ...mapPrice(item, areaTotal, rates),
    area_total: areaTotal,
    area_life: item.area_life,
    area_kitchen: item.area_kitchen,
    area_lot: areaLot,
    room_count: roomCount,
    storey: toInt(item.storey),
    storeys: toInt(item.storeys),
    repair: knownValue(repairSchema, item.repair),
    wall_material: knownValue(wallMaterialSchema, item.wall_material),
    housing_class: knownValue(housingClassSchema, item.housing_class),
    is_newbuilding: item.is_newbuilding,
    locality,
    district,
    street: orNull(item.street),
    house: orNull(view?.housestr),
    title: buildPropertyTitle({
      property_type: propertyType,
      prop_kind: propKind,
      room_count: roomCount,
      area_total: areaTotal,
      area_lot: areaLot,
      locality,
      district,
    }),
    description: htmlToPlainText(view?.promo_text),
    source_updated_at: parseKyivDateTime(item.date_mod),
    // The payload is JSON-parsed Plektan data, so it satisfies Json; zod types it as unknown values.
    raw: (view?.raw ?? item.raw) as Json,
  };

  return { kind: "row", row, agentExternalId: view?.users[0]?.user_id ?? null };
};
