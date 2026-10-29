import { z } from "zod";
import { DEALS, PROPERTY_TYPES } from "./property-values";

/** Admin properties list: URL filters and the pure helpers around them (no server-only: the UI imports it). */

export const ADMIN_PROPERTIES_PAGE_SIZE = 20;
export const ADMIN_PROPERTY_SEARCH_MAX_LENGTH = 100;

export const ADMIN_PROPERTY_STATUSES = ["all", "published", "hidden", "draft"] as const;
export const ADMIN_PROPERTY_SOURCES = ["all", "plektan", "admin"] as const;
export const ADMIN_PROPERTY_DEAL_FILTERS = ["all", ...DEALS] as const;
export const ADMIN_PROPERTY_TYPE_FILTERS = ["all", ...PROPERTY_TYPES] as const;

/** `draft` = hidden and never published; `hidden` = hidden after being published. */
export type AdminListStatus = "published" | "hidden" | "draft";

const first = (v: unknown): unknown => (Array.isArray(v) ? v[0] : v);

const choice = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(first, z.enum(values).catch("all"));

export const adminPropertyFiltersSchema = z.object({
  status: choice(ADMIN_PROPERTY_STATUSES),
  source: choice(ADMIN_PROPERTY_SOURCES),
  deal: choice(ADMIN_PROPERTY_DEAL_FILTERS),
  type: choice(ADMIN_PROPERTY_TYPE_FILTERS),
  q: z.preprocess(
    (v) => {
      const s = first(v);
      if (typeof s !== "string") return undefined;
      const t = s.trim().slice(0, ADMIN_PROPERTY_SEARCH_MAX_LENGTH).trim();
      return t === "" ? undefined : t;
    },
    z.string().optional(),
  ),
  page: z.preprocess(first, z.coerce.number().int().min(1).max(100_000).catch(1)),
});

export type AdminPropertyFilters = z.infer<typeof adminPropertyFiltersSchema>;
export type AdminPropertySearchParams = Record<string, string | string[] | undefined>;

/** Never throws: invalid values fall back to defaults. */
export const parseAdminPropertyFilters = (searchParams: AdminPropertySearchParams): AdminPropertyFilters =>
  adminPropertyFiltersSchema.parse({
    status: searchParams.status,
    source: searchParams.source,
    deal: searchParams.deal,
    type: searchParams.type,
    q: searchParams.q,
    page: searchParams.page,
  });

/**
 * Query string for a filter link, defaults dropped (`all`, empty `q`, `page=1`).
 * Any override other than `page` resets the page, unless `page` is overridden too.
 */
export const adminPropertiesSearchParams = (
  filters: AdminPropertyFilters,
  overrides: Partial<AdminPropertyFilters> = {},
): URLSearchParams => {
  const changesFilter = (Object.keys(overrides) as (keyof AdminPropertyFilters)[]).some((k) => k !== "page");
  const next: AdminPropertyFilters = {
    ...filters,
    ...overrides,
    ...(changesFilter && !("page" in overrides) ? { page: 1 } : {}),
  };
  const params = new URLSearchParams();
  if (next.status !== "all") params.set("status", next.status);
  if (next.source !== "all") params.set("source", next.source);
  if (next.deal !== "all") params.set("deal", next.deal);
  if (next.type !== "all") params.set("type", next.type);
  if (next.q) params.set("q", next.q);
  if (next.page > 1) params.set("page", String(next.page));
  return params;
};

// ----- Search --------------------------------------------------------------------------------

/** Escapes `\`, `%` and `_` so user text is matched literally by `ilike`. */
export const escapeLikeValue = (value: string): string => value.replace(/[\\%_]/g, (c) => "\\" + c);

/** Wraps a value for a PostgREST `.or()` clause: double quotes make `,` `(` `)` literal; `\` and `"` are escaped. */
export const quoteOrValue = (value: string): string => `"${value.replace(/[\\"]/g, (c) => "\\" + c)}"`;

/** Digits only after dropping spaces and a leading «№» → an external id; else null. */
export const externalIdQuery = (q: string): string | null => {
  const compact = q.replace(/\s+/g, "").replace(/^№/, "");
  return /^\d+$/.test(compact) ? compact : null;
};

/** The `.or()` expression for `q` (all values quoted and LIKE-escaped). */
export const propertySearchOr = (q: string): string => {
  const like = quoteOrValue(`%${escapeLikeValue(q)}%`);
  const id = externalIdQuery(q);
  if (id) return `external_id.eq.${quoteOrValue(id)},title.ilike.${like}`;
  return ["title", "locality", "district", "street"].map((c) => `${c}.ilike.${like}`).join(",");
};
