import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";

export const ADMIN_LEAD_KINDS = ["property_request", "general", "ai"] as const satisfies readonly Database["public"]["Enums"]["lead_kind"][];

/** Admin leads list: URL filters, their parsing and the pure helpers around them (no server-only: the UI imports it). */

export const ADMIN_LEADS_PAGE_SIZE = 20;
export const KYIV_TIME_ZONE = "Europe/Kyiv";
export const SEARCH_MAX_LENGTH = 100;
/** `q` with at least this many digits is a phone search; otherwise a name search. */
export const PHONE_SEARCH_MIN_DIGITS = 3;

/** First value of a Next `searchParams` entry. */
const first = (v: unknown): unknown => (Array.isArray(v) ? v[0] : v);

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `YYYY-MM-DD` that is a real calendar date, else undefined. */
const parseDay = (v: unknown): string | undefined => {
  if (typeof v !== "string") return undefined;
  const m = DATE_RE.exec(v);
  if (!m) return undefined;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  const real = date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
  return real ? v : undefined;
};

const day = z.preprocess((v) => parseDay(first(v)), z.string().optional());

export const adminLeadFiltersSchema = z
  .object({
    kind: z.preprocess(first, z.enum(ADMIN_LEAD_KINDS).optional().catch(undefined)),
    from: day,
    to: day,
    q: z.preprocess(
      (v) => {
        const s = first(v);
        if (typeof s !== "string") return undefined;
        const t = s.trim().slice(0, SEARCH_MAX_LENGTH).trim();
        return t === "" ? undefined : t;
      },
      z.string().optional(),
    ),
    failed: z.preprocess((v) => first(v) === "1", z.boolean()),
    page: z.preprocess(first, z.coerce.number().int().min(1).max(100_000).catch(1)),
  })
  .transform((f) => {
    // `from` after `to`: swap, so the range the user typed still returns something.
    if (f.from && f.to && f.from > f.to) return { ...f, from: f.to, to: f.from };
    return f;
  });

export type AdminLeadFilters = z.infer<typeof adminLeadFiltersSchema>;
export type AdminLeadSearchParams = Record<string, string | string[] | undefined>;

/** Never throws: invalid values fall back to defaults. */
export const parseAdminLeadFilters = (searchParams: AdminLeadSearchParams): AdminLeadFilters =>
  adminLeadFiltersSchema.parse({
    kind: searchParams.kind,
    from: searchParams.from,
    to: searchParams.to,
    q: searchParams.q,
    failed: searchParams.failed,
    page: searchParams.page,
  });

/**
 * Query string for a filter link, defaults dropped (`page=1`, `failed` off, empty values).
 * Any override other than `page` resets the page, unless `page` is overridden too.
 */
export const adminLeadsSearchParams = (
  filters: AdminLeadFilters,
  overrides: Partial<AdminLeadFilters> = {},
): URLSearchParams => {
  const changesFilter = (Object.keys(overrides) as (keyof AdminLeadFilters)[]).some((k) => k !== "page");
  const next: AdminLeadFilters = {
    ...filters,
    ...overrides,
    ...(changesFilter && !("page" in overrides) ? { page: 1 } : {}),
  };
  const params = new URLSearchParams();
  if (next.kind) params.set("kind", next.kind);
  if (next.from) params.set("from", next.from);
  if (next.to) params.set("to", next.to);
  if (next.q) params.set("q", next.q);
  if (next.failed) params.set("failed", "1");
  if (next.page > 1) params.set("page", String(next.page));
  return params;
};

// ----- Kyiv day bounds -----------------------------------------------------------------------

const kyivFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: KYIV_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

/** Kyiv offset from UTC (ms) at the given instant. */
const kyivOffsetMs = (utcMs: number): number => {
  const p: Record<string, number> = {};
  for (const part of kyivFormat.formatToParts(new Date(utcMs))) {
    if (part.type !== "literal") p[part.type] = Number(part.value);
  }
  const wallAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wallAsUtc - Math.floor(utcMs / 1000) * 1000;
};

/** UTC instant of 00:00 Kyiv time on `YYYY-MM-DD` (DST-aware). */
const kyivMidnightMs = (isoDay: string): number => {
  const [y, m, d] = isoDay.split("-").map(Number);
  const naive = Date.UTC(y, m - 1, d);
  // Two passes settle the offset when the guess falls on the other side of a DST switch.
  const guess = naive - kyivOffsetMs(naive);
  return naive - kyivOffsetMs(guess);
};

const nextDay = (isoDay: string): string => {
  const [y, m, d] = isoDay.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
};

export type CreatedAtBounds = {
  /** Inclusive, ISO UTC: start of `from` in Kyiv. */
  gte?: string;
  /** Exclusive, ISO UTC: start of the day after `to` in Kyiv. */
  lt?: string;
};

export const kyivDayBounds = (from?: string, to?: string): CreatedAtBounds => ({
  ...(from ? { gte: new Date(kyivMidnightMs(from)).toISOString() } : {}),
  ...(to ? { lt: new Date(kyivMidnightMs(nextDay(to))).toISOString() } : {}),
});

// ----- Search --------------------------------------------------------------------------------

/**
 * Escapes `\`, `%` and `_` so user text is matched literally by `ilike`. Commas and parentheses
 * are only special inside `.or()` / `.in()` lists; the search uses plain `.ilike()`, where they
 * are safe, so they are kept (names may contain them).
 */
export const escapeLikeValue = (value: string): string => value.replace(/[\\%_]/g, (c) => "\\" + c);

export type LeadSearch = { column: "phone" | "name"; pattern: string };

/** ≥ 3 digits → phone (digits only, substring); else name substring. */
export const leadSearch = (q: string): LeadSearch => {
  const digits = q.replace(/\D/g, "");
  if (digits.length >= PHONE_SEARCH_MIN_DIGITS) return { column: "phone", pattern: `%${digits}%` };
  return { column: "name", pattern: `%${escapeLikeValue(q)}%` };
};
