import "server-only";

import { z } from "zod";

import { catalogHref, parseCatalogState, toPropertyFilters } from "@/features/catalog/catalog-params";
import type { SearchParams } from "@/features/catalog/catalog-params";
import { loadDistrictOptions } from "@/features/catalog/load-district-options";
import { DEAL_LABELS, PROPERTY_TYPE_LABELS } from "@/features/properties/property-labels";
import { getPublishedProperties, ROOM_OPTIONS, SORTS } from "@/lib/db/properties";
import type { PropertyFilters, PropertyPage, PublishedProperty } from "@/lib/db/properties";
import { CURRENCIES, PROPERTY_TYPES } from "@/lib/db/property-values";
import { getExchangeRates } from "@/lib/db/settings";
import type { ExchangeRates } from "@/lib/db/settings";
import { formatPrice } from "@/lib/format/format-price";
import type { LlmToolDefinition } from "@/lib/llm";
import { smallestPhotoUrl } from "@/lib/photos/photo-src-set";

import type { AssistantEvent, AssistantPropertyCard } from "./assistant-events";
import { propertyPath } from "./build-system-prompt";

export const SEARCH_PROPERTIES_TOOL = "search_properties";
/** The model and the chat show at most this many properties per search. */
export const SEARCH_RESULT_LIMIT = 5;
const MAX_LISTED_DISTRICTS = 30;

const DEAL_ARGS = ["buy", "rent", "rent_daily"] as const;
/** Assistant deal words → the catalog's `deal` values. */
const CATALOG_DEAL = { buy: "sell", rent: "rent_long", rent_daily: "rent_day" } as const satisfies Record<
  (typeof DEAL_ARGS)[number],
  PropertyFilters["deal"] & string
>;

/** The model may send room counts as numbers (`2`) or the catalog's strings (`"2"`, `"5+"`). */
export const roomSchema = z.union([
  z.enum(ROOM_OPTIONS),
  z
    .number()
    .int()
    .min(1)
    .transform((n): (typeof ROOM_OPTIONS)[number] => (n >= 5 ? "5+" : n === 4 ? "4" : n === 3 ? "3" : n === 2 ? "2" : "1")),
]);

/** Tool arguments are model output: everything optional, `null` counts as «not set», nothing trusted. */
export const searchPropertiesArgsSchema = z.object({
  deal: z.enum(DEAL_ARGS).nullish(),
  property_type: z.enum(PROPERTY_TYPES).nullish(),
  rooms: z.array(roomSchema).max(5).nullish(),
  budget_from: z.number().finite().nonnegative().nullish(),
  budget_to: z.number().finite().nonnegative().nullish(),
  currency: z.enum(CURRENCIES).nullish(),
  district: z.string().trim().min(1).max(100).nullish(),
  sort: z.enum(SORTS).nullish(),
});

export type SearchPropertiesArgs = z.infer<typeof searchPropertiesArgsSchema>;

export const searchPropertiesDefinition: LlmToolDefinition = {
  name: SEARCH_PROPERTIES_TOOL,
  description:
    "Search the agency's published properties. Call it before naming any property. Returns up to 5 properties and the total count. All arguments are optional; pass only what the visitor has said.",
  parameters: {
    type: "object",
    properties: {
      deal: { type: "string", enum: [...DEAL_ARGS], description: "buy, rent (long-term) or rent_daily (per day)" },
      property_type: { type: "string", enum: [...PROPERTY_TYPES] },
      rooms: {
        type: "array",
        items: { type: "string", enum: [...ROOM_OPTIONS] },
        description: "Room counts; \"5+\" means five or more",
      },
      budget_from: { type: "number", description: "Minimum price in `currency`" },
      budget_to: { type: "number", description: "Maximum price in `currency`" },
      currency: { type: "string", enum: [...CURRENCIES], description: "Currency of the budget, default USD" },
      district: { type: "string", description: "District name as the visitor said it" },
      sort: { type: "string", enum: [...SORTS], description: "Default newest" },
    },
    additionalProperties: false,
  },
};

/** Case-insensitive district match: exact first, then a single district that contains (or is contained in) the input. */
export const matchDistrict = (input: string, districts: readonly string[]): string | null => {
  const wanted = input.trim().toLowerCase();
  if (wanted === "") return null;
  const exact = districts.find((d) => d.trim().toLowerCase() === wanted);
  if (exact) return exact;
  const partial = districts.filter((d) => {
    const name = d.trim().toLowerCase();
    return name.includes(wanted) || wanted.includes(name);
  });
  return partial.length === 1 && partial[0] ? partial[0] : null;
};

export type BuiltSearch = {
  filters: PropertyFilters;
  catalogUrl: string;
  /** The district the model asked for when it is not one of ours (then it is not filtered on). */
  ignoredDistrict: string | null;
};

/**
 * Tool arguments → catalog state (through the catalog's own parser, so invalid values are dropped the same
 * way) → filters with the budget in USD, plus the catalog URL that reproduces the same results.
 */
export const buildSearch = (
  args: SearchPropertiesArgs,
  districts: readonly string[],
  rates: ExchangeRates,
): BuiltSearch => {
  const matched = args.district ? matchDistrict(args.district, districts) : null;
  const params: SearchParams = {
    deal: args.deal ? CATALOG_DEAL[args.deal] : undefined,
    property_type: args.property_type ?? undefined,
    rooms: args.rooms?.length ? args.rooms : undefined,
    price_from: args.budget_from != null ? String(args.budget_from) : undefined,
    price_to: args.budget_to != null ? String(args.budget_to) : undefined,
    currency: args.currency ?? "USD",
    district: matched ?? undefined,
    sort: args.sort ?? undefined,
  };
  const state = parseCatalogState(params);
  return {
    filters: toPropertyFilters(state, rates),
    catalogUrl: catalogHref(state),
    ignoredDistrict: args.district && !matched ? args.district : null,
  };
};

const priceOf = (p: PublishedProperty): string =>
  p.price_amount !== null && p.currency !== null
    ? formatPrice(p.price_amount, p.currency, p.deal)
    : formatPrice(null, "USD");

export const toPropertyCard = (p: PublishedProperty): AssistantPropertyCard => {
  const photo = p.property_photos[0];
  return {
    slug: p.slug,
    title: p.title,
    price: priceOf(p),
    rooms: p.room_count,
    area_total: p.area_total,
    district: p.district,
    photo_url: photo ? smallestPhotoUrl(photo) : null,
    url: propertyPath(p.slug),
  };
};

const toModelItem = (p: PublishedProperty) => ({
  title: p.title,
  price: priceOf(p),
  deal: DEAL_LABELS[p.deal],
  type: PROPERTY_TYPE_LABELS[p.property_type],
  rooms: p.room_count,
  area_m2: p.area_total,
  district: p.district,
  url: propertyPath(p.slug),
});

export type PropertiesEvent = Extract<AssistantEvent, { type: "properties" }>;

export type ToolOutcome = {
  /** The tool message the model reads (compact JSON). */
  content: string;
  /** What the client gets, when there is something to show. */
  event?: PropertiesEvent;
};

export type SearchPropertiesDeps = {
  getProperties: (filters: PropertyFilters) => Promise<PropertyPage>;
  getRates: () => Promise<ExchangeRates>;
  getDistricts: () => Promise<string[]>;
};

const defaultDeps: SearchPropertiesDeps = {
  getProperties: getPublishedProperties,
  getRates: getExchangeRates,
  getDistricts: loadDistrictOptions,
};

const failure = (error: string, extra: Record<string, unknown> = {}): ToolOutcome => ({
  content: JSON.stringify({ error, ...extra }),
});

/** Runs `search_properties` for the raw JSON arguments of a model's tool call. Never throws. */
export const runSearchProperties = async (
  rawArguments: string,
  deps: SearchPropertiesDeps = defaultDeps,
): Promise<ToolOutcome> => {
  let json: unknown;
  try {
    json = rawArguments.trim() === "" ? {} : JSON.parse(rawArguments);
  } catch {
    return failure("invalid_arguments", { hint: "Arguments must be a JSON object." });
  }
  const parsed = searchPropertiesArgsSchema.safeParse(json);
  if (!parsed.success) {
    return failure("invalid_arguments", {
      hint: "Fix the arguments and call again.",
      problems: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".") || "arguments"}: ${i.message}`),
    });
  }
  const args = parsed.data;

  try {
    const [rates, districts] = await Promise.all([
      deps.getRates(),
      args.district ? deps.getDistricts() : Promise.resolve([]),
    ]);
    const search = buildSearch(args, districts, rates);
    const page = await deps.getProperties(search.filters);
    const shown = page.items.slice(0, SEARCH_RESULT_LIMIT);

    return {
      content: JSON.stringify({
        total: page.total,
        shown: shown.length,
        items: shown.map(toModelItem),
        ...(search.ignoredDistrict
          ? {
              district_ignored: `"${search.ignoredDistrict}" is not a district we have; the search ran without it.`,
              available_districts: districts.slice(0, MAX_LISTED_DISTRICTS),
            }
          : {}),
      }),
      event: {
        type: "properties",
        items: shown.map(toPropertyCard),
        total: page.total,
        catalog_url: search.catalogUrl,
      },
    };
  } catch {
    console.error("[assistant] property search failed");
    return failure("search_failed", { hint: "Tell the visitor the search is unavailable right now." });
  }
};
