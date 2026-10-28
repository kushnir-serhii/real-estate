import "server-only";

import { z } from "zod";

import { encodeForm, FORM_CONTENT_TYPE } from "./encode-form";
import { PlektanError } from "./errors";
import { addAdvertFixtureResponse, parseLeadsFixtureMode, type PlektanLeadsFixtureMode } from "./fixtures/leads";
import { fixtureResponse, parseFixtureSet } from "./fixtures/transport";
import {
  addAdvertResponseSchema,
  contactPersonsResponseSchema,
  districtsResponseSchema,
  searchResponseSchema,
  viewResponseSchema,
  type PlektanAddAdvertResult,
  type PlektanContactPerson,
  type PlektanDistrict,
  type PlektanListItem,
  type PlektanViewItem,
} from "./schemas";

export const PLEKTAN_DEALS = ["sell", "rent_long", "rent_day"] as const;
export type PlektanDeal = (typeof PLEKTAN_DEALS)[number];

export const PLEKTAN_PROPERTIES = ["flat", "house", "commercial", "plot"] as const;
export type PlektanProperty = (typeof PLEKTAN_PROPERTIES)[number];

export const PLEKTAN_MAX_ROWS_PER_PAGE = 20;
const SEARCH_PAGES_HARD_LIMIT = 500;

const PLEKTAN_BASE_URL = "https://re.plektan.com";
const API_VERSION = "1.1";

/** Param names are Plektan's own, so docs and code read the same. */
export type PlektanSearchParams = {
  deal: PlektanDeal;
  property: PlektanProperty;
  prop_kind: readonly string[];
  geo_search_by?: "city" | "region";
  country_id?: number | string;
  region_id?: number | string;
  locality_id?: number | string;
  /** `'YYYY-MM-DD HH:MM'` */
  after_date?: string;
  /** 1-based. */
  currentPage?: number;
  /** Capped at 20. */
  rowsPerPage?: number;
};

export type PlektanViewParams = {
  adid: string | number;
  currency_id?: number | string | (number | string)[];
};

export type PlektanDistrictsParams = {
  country_id?: number | string;
  region_id?: number | string;
  locality_id?: number | string;
};

type AddAdvertClient = {
  client_name: string;
  /** Sent as `phones[1]`. */
  phone: string;
  client_email?: string;
};

/**
 * Lead sent to «неперевірені» with the mark «З сайту компанії». Two shapes (told apart by `like_advert`):
 * - quick request: «Цікавить об'єкт №…» (`like_advert` = the advert id; the API wants an email);
 * - regular request: a buy / hire wish (`deal`, `property`, all `prop_kind`s, `advert_info`).
 * `property` / `prop_kind` are «common required» in the docs, so the quick request sends them when known.
 */
export type PlektanAddAdvertParams =
  | (AddAdvertClient & {
      like_advert: string;
      client_email: string;
      property?: PlektanProperty;
      prop_kind?: readonly string[];
    })
  | (AddAdvertClient & {
      deal: "buy" | "hire_long" | "hire_day";
      property: PlektanProperty;
      prop_kind: readonly string[];
      advert_info?: string;
    });

export type PlektanSearchPage = { items: PlektanListItem[]; totalRows: number };

export type PlektanClientConfig = {
  /** Empty / undefined = fixture mode. */
  apiKey?: string;
  lang?: string;
  /** `base` (default) or `next`; only used in fixture mode. */
  fixtureSet?: string;
  /**
   * Local transport for `addAdvert` only (`PLEKTAN_LEADS_FIXTURE`). Without it and without a key,
   * `addAdvert` throws: the caller (`deliverLead`) marks the channel `skipped` before calling.
   */
  leadsFixture?: PlektanLeadsFixtureMode | null;
  baseUrl?: string;
  timeoutMs?: number;
  /** Retries after the first attempt, on network errors and 5xx only. Never applied to `addAdvert`. */
  retries?: number;
  /** First backoff delay; doubles each retry. */
  backoffMs?: number;
  fetch?: typeof fetch;
};

export type PlektanClient = {
  isFixtureMode: boolean;
  search: (params: PlektanSearchParams) => Promise<PlektanSearchPage>;
  searchAll: (params: Omit<PlektanSearchParams, "currentPage">) => Promise<PlektanSearchPage>;
  view: (params: PlektanViewParams) => Promise<PlektanViewItem>;
  getContactPersons: () => Promise<PlektanContactPerson[]>;
  getDistricts: (params?: PlektanDistrictsParams) => Promise<PlektanDistrict[]>;
  addAdvert: (params: PlektanAddAdvertParams) => Promise<PlektanAddAdvertResult>;
};

const sleep = (ms: number): Promise<void> =>
  ms <= 0 ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, ms));

/** Plektan answers errors inside a 200: `{ result: "ERROR", message }` or `{ error }`. */
const detectApiError = (body: unknown): string | null => {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
  const record: Record<string, unknown> = { ...body };
  const result = typeof record.result === "string" ? record.result.toUpperCase() : "";
  const message = typeof record.message === "string" ? record.message : "";
  if (result === "ERROR" || result === "PARSE_ERROR") return message || result;
  if (typeof record.error === "string" && record.error !== "") return record.error;
  return null;
};

const parseResponse = <T>(schema: z.ZodType<T, unknown>, body: unknown, what: string): T => {
  const apiError = detectApiError(body);
  if (apiError !== null) throw new PlektanError({ kind: "api", message: apiError });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    // Paths and messages only: response values may contain personal data.
    const issues = parsed.error.issues
      .slice(0, 10)
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
    throw new PlektanError({
      kind: "invalid_response",
      message: `${what} response has an unexpected shape`,
      issues,
    });
  }
  return parsed.data;
};

export const createPlektanClient = (config: PlektanClientConfig = {}): PlektanClient => {
  const apiKey = (config.apiKey ?? "").trim();
  const isFixtureMode = apiKey === "";
  const lang = (config.lang ?? "").trim() || "uk";
  const baseUrl = config.baseUrl ?? PLEKTAN_BASE_URL;
  const timeoutMs = config.timeoutMs ?? 15_000;
  const retries = config.retries ?? 2;
  const backoffMs = config.backoffMs ?? 500;
  const fetchImpl = config.fetch ?? fetch;
  const fixtureSet = isFixtureMode ? parseFixtureSet(config.fixtureSet) : "base";

  const sendOnce = async (url: string, body: string): Promise<unknown> => {
    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: "POST",
        headers: {
          "x-auth-token": apiKey,
          "content-type": FORM_CONTENT_TYPE,
          accept: "application/json",
        },
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.name : "unknown";
      throw new PlektanError({ kind: "network", message: `request failed (${reason})` });
    }
    if (!response.ok) {
      throw new PlektanError({
        kind: "http",
        message: `HTTP ${response.status}`,
        status: response.status,
      });
    }
    try {
      return await response.json();
    } catch {
      throw new PlektanError({
        kind: "invalid_response",
        message: "response is not valid JSON",
        issues: [],
      });
    }
  };

  const isRetryable = (error: PlektanError): boolean =>
    error.details.kind === "network" || (error.details.kind === "http" && error.details.status >= 500);

  const call = async (
    section: string,
    command: string,
    params: Record<string, unknown>,
    retriesOverride?: number,
  ): Promise<unknown> => {
    if (isFixtureMode) return fixtureResponse(fixtureSet, section, command, params);

    const url = `${baseUrl}/${lang}/${section}/${command}`;
    const body = encodeForm({ ...params, version: API_VERSION });
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await sendOnce(url, body);
      } catch (error) {
        if (!(error instanceof PlektanError) || !isRetryable(error) || attempt >= (retriesOverride ?? retries)) {
          throw error;
        }
        await sleep(backoffMs * 2 ** attempt);
      }
    }
  };

  const search = async (params: PlektanSearchParams): Promise<PlektanSearchPage> => {
    const rowsPerPage = Math.min(params.rowsPerPage ?? PLEKTAN_MAX_ROWS_PER_PAGE, PLEKTAN_MAX_ROWS_PER_PAGE);
    const body = await call("API_serp", "search", {
      ...params,
      currentPage: params.currentPage ?? 1,
      rowsPerPage,
    });
    const parsed = parseResponse(searchResponseSchema, body, "search");
    return { items: parsed.data, totalRows: parsed.totalRows };
  };

  const searchAll = async (
    params: Omit<PlektanSearchParams, "currentPage">,
  ): Promise<PlektanSearchPage> => {
    const rowsPerPage = Math.min(params.rowsPerPage ?? PLEKTAN_MAX_ROWS_PER_PAGE, PLEKTAN_MAX_ROWS_PER_PAGE);
    // By adid: rows can shift between pages while the agency edits.
    const byId = new Map<string, PlektanListItem>();
    let totalRows = 0;
    for (let page = 1; page <= SEARCH_PAGES_HARD_LIMIT; page += 1) {
      const result = await search({ ...params, rowsPerPage, currentPage: page });
      totalRows = result.totalRows;
      for (const item of result.items) byId.set(item.adid, item);
      // An empty page ends the loop even if totalRows promised more.
      if (result.items.length === 0 || page * rowsPerPage >= totalRows) break;
    }
    return { items: [...byId.values()], totalRows };
  };

  const view = async (params: PlektanViewParams): Promise<PlektanViewItem> => {
    const body = await call("API_view", "view", { ...params });
    return parseResponse(viewResponseSchema, body, "view");
  };

  const getContactPersons = async (): Promise<PlektanContactPerson[]> => {
    const body = await call("API_user", "getContactPersons", {});
    return parseResponse(contactPersonsResponseSchema, body, "getContactPersons");
  };

  const getDistricts = async (params: PlektanDistrictsParams = {}): Promise<PlektanDistrict[]> => {
    const body = await call("API_geo", "getDistricts", { ...params });
    return parseResponse(districtsResponseSchema, body, "getDistricts");
  };

  const addAdvert = async (params: PlektanAddAdvertParams): Promise<PlektanAddAdvertResult> => {
    let body: unknown;
    if (config.leadsFixture) {
      body = addAdvertFixtureResponse(config.leadsFixture);
    } else if (isFixtureMode) {
      throw new PlektanError({ kind: "api", message: "addAdvert needs PLEKTAN_API_KEY" });
    } else {
      const { phone, ...rest } = params;
      // Non-idempotent POST: no automatic retry (a second try could create a duplicate lead).
      body = await call("API_view", "addAdvert", { ...rest, phones: { 1: phone } }, 0);
    }
    const parsed = parseResponse(addAdvertResponseSchema, body, "addAdvert");
    if (parsed.result.toUpperCase() !== "ADDED") {
      throw new PlektanError({ kind: "api", message: `addAdvert result ${parsed.result}` });
    }
    return { itemId: parsed.item_id };
  };

  return { isFixtureMode, search, searchAll, view, getContactPersons, getDistricts, addAdvert };
};

/** Client configured from env; read on every call so tests and scripts can change env. */
const clientFromEnv = (): PlektanClient =>
  createPlektanClient({
    apiKey: process.env.PLEKTAN_API_KEY,
    lang: process.env.PLEKTAN_LANG,
    fixtureSet: process.env.PLEKTAN_FIXTURE_SET,
    leadsFixture: parseLeadsFixtureMode(process.env.PLEKTAN_LEADS_FIXTURE),
  });

export const search = (params: PlektanSearchParams) => clientFromEnv().search(params);
export const searchAll = (params: Omit<PlektanSearchParams, "currentPage">) =>
  clientFromEnv().searchAll(params);
export const view = (params: PlektanViewParams) => clientFromEnv().view(params);
export const getContactPersons = () => clientFromEnv().getContactPersons();
export const getDistricts = (params?: PlektanDistrictsParams) => clientFromEnv().getDistricts(params);
export const addAdvert = (params: PlektanAddAdvertParams) => clientFromEnv().addAdvert(params);

export type PlektanLeadsMode = "off" | "live" | { fixture: PlektanLeadsFixtureMode };

/** How Plektan leads run now: fixture flag wins, then a key means live, otherwise the channel is off (`skipped`). */
export const resolvePlektanLeadsMode = (): PlektanLeadsMode => {
  const fixture = parseLeadsFixtureMode(process.env.PLEKTAN_LEADS_FIXTURE);
  if (fixture) return { fixture };
  return (process.env.PLEKTAN_API_KEY ?? "").trim() === "" ? "off" : "live";
};
