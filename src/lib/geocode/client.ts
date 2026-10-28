import "server-only";
import { z } from "zod";
import { GeocodeError } from "./errors";
import { geocodeFixture } from "./fixture";
import type { GeocodeInput, GeocodePrecision, GeocodeResult } from "./types";

/**
 * Nominatim (OpenStreetMap) behind a small client. Usage policy: identify with a User-Agent + email,
 * at most one request per second, no bulk hammering. Results are rounded to ~100 m: the site shows an area.
 * Fixture mode (empty `GEOCODER_CONTACT_EMAIL`) never touches the network.
 */

const ENDPOINT = "https://nominatim.openstreetmap.org/search";
const TIMEOUT_MS = 10_000;
const MIN_GAP_MS = 1_100;
const RETRY_DELAY_MS = 1_500;

const responseSchema = z.array(z.object({ lat: z.string(), lon: z.string() }).passthrough());

export const roundCoordinate = (value: number): number => Math.round(value * 1000) / 1000;

export type GeocoderConfig = {
  /** Empty = fixture mode. Defaults to `GEOCODER_CONTACT_EMAIL`. */
  contactEmail?: string;
  fetch?: typeof fetch;
  /** Minimum gap between two requests (tests set 0). */
  minGapMs?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
};

export type Geocoder = {
  geocode: (input: GeocodeInput) => Promise<GeocodeResult | null>;
  /** Forget a rate-limit stop (a new sync run starts fresh). */
  reset: () => void;
};

const clean = (value: string | null | undefined): string => (value ?? "").trim();

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** The queries to try, most precise first; levels without the needed input are left out. */
const queriesFor = (input: GeocodeInput): { precision: GeocodePrecision; q: string }[] => {
  const locality = clean(input.locality);
  const district = clean(input.district);
  const street = clean(input.street);
  const house = clean(input.house);
  if (locality === "") return [];
  const area = [district, locality].filter((part) => part !== "").join(", ");
  const out: { precision: GeocodePrecision; q: string }[] = [];
  if (street !== "" && house !== "") out.push({ precision: "house", q: `${street} ${house}, ${area}` });
  if (street !== "") out.push({ precision: "street", q: `${street}, ${area}` });
  if (district !== "") out.push({ precision: "district", q: area });
  out.push({ precision: "locality", q: locality });
  return out;
};

export const createGeocoder = (config: GeocoderConfig = {}): Geocoder => {
  const readEmail = (): string => (config.contactEmail ?? process.env.GEOCODER_CONTACT_EMAIL ?? "").trim();
  const minGap = config.minGapMs ?? MIN_GAP_MS;
  const retryDelay = config.retryDelayMs ?? RETRY_DELAY_MS;
  const timeoutMs = config.timeoutMs ?? TIMEOUT_MS;

  let rateLimited = false;
  let queue: Promise<unknown> = Promise.resolve();
  let lastRequestAt = 0;

  // Requests are serialized with a gap, so concurrent callers still stay under 1 request/s.
  const throttled = <T>(task: () => Promise<T>): Promise<T> => {
    const run = queue.then(async () => {
      const wait = lastRequestAt + minGap - Date.now();
      if (wait > 0) await sleep(wait);
      try {
        return await task();
      } finally {
        lastRequestAt = Date.now();
      }
    });
    queue = run.catch(() => undefined);
    return run;
  };

  const request = async (q: string, email: string): Promise<{ lat: number; lng: number } | null> => {
    const params = new URLSearchParams({
      q,
      format: "jsonv2",
      limit: "1",
      countrycodes: "ua",
      "accept-language": "uk",
      email,
    });
    let response: Response;
    try {
      response = await (config.fetch ?? fetch)(`${ENDPOINT}?${params.toString()}`, {
        headers: { "User-Agent": `LyndrikSync/1.0 (${email})`, Accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new GeocodeError("network", "request failed or timed out");
    }
    if (response.status === 429) {
      rateLimited = true;
      throw new GeocodeError("rate_limited", "HTTP 429");
    }
    if (!response.ok) throw new GeocodeError("http", `HTTP ${response.status}`);
    const parsed = responseSchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) throw new GeocodeError("invalid_response", "unexpected response shape");
    const first = parsed.data[0];
    if (first === undefined) return null;
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new GeocodeError("invalid_response", "bad coordinates");
    return { lat, lng };
  };

  // One retry on network / 5xx; a 429 is never retried.
  const requestWithRetry = async (q: string, email: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      return await throttled(() => request(q, email));
    } catch (error) {
      const retryable = error instanceof GeocodeError && (error.kind === "network" || error.kind === "http");
      if (!retryable) throw error;
      await sleep(retryDelay);
      return throttled(() => request(q, email));
    }
  };

  const geocode = async (input: GeocodeInput): Promise<GeocodeResult | null> => {
    const email = readEmail();
    if (email === "") {
      const found = geocodeFixture(input);
      return found === null ? null : { ...found, lat: roundCoordinate(found.lat), lng: roundCoordinate(found.lng) };
    }
    if (rateLimited) throw new GeocodeError("rate_limited", "stopped for this run");
    for (const { precision, q } of queriesFor(input)) {
      const found = await requestWithRetry(q, email);
      if (found !== null) return { lat: roundCoordinate(found.lat), lng: roundCoordinate(found.lng), precision };
    }
    return null;
  };

  return {
    geocode,
    reset: () => {
      rateLimited = false;
    },
  };
};

const shared = createGeocoder();

/** Shared instance: its throttle is module-level, so every caller in the process stays under 1 request/s. */
export const geocode = shared.geocode;
export const resetGeocoder = shared.reset;
