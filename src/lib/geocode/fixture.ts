import { createHash } from "node:crypto";
import type { GeocodeInput, GeocodeResult } from "./types";

/**
 * Fixture mode (no `GEOCODER_CONTACT_EMAIL`): deterministic coordinates around known Kyiv-area centers.
 * A locality that is not in the table gives `null`, which exercises the "no result" path.
 */

type Center = { lat: number; lng: number };

const LOCALITIES: Record<string, Center> = {
  київ: { lat: 50.4501, lng: 30.5234 },
  козин: { lat: 50.2392, lng: 30.6406 },
  ірпінь: { lat: 50.5218, lng: 30.2506 },
  буча: { lat: 50.5436, lng: 30.2125 },
  вишневе: { lat: 50.3874, lng: 30.3685 },
  бровари: { lat: 50.5115, lng: 30.7902 },
  бориспіль: { lat: 50.3527, lng: 30.9549 },
};

const KYIV_DISTRICTS: Record<string, Center> = {
  оболонь: { lat: 50.5, lng: 30.498 },
  печерськ: { lat: 50.4234, lng: 30.5446 },
  поділ: { lat: 50.4651, lng: 30.5158 },
  позняки: { lat: 50.3965, lng: 30.6339 },
  теремки: { lat: 50.3639, lng: 30.4854 },
};

const key = (value: string | null | undefined): string => (value ?? "").trim().toLowerCase();

/** A stable offset within about 1 km, derived from the text. */
const offsetFor = (text: string): Center => {
  const digest = createHash("sha1").update(text).digest();
  const unit = (byte: number | undefined): number => ((byte ?? 0) / 255) * 2 - 1;
  return { lat: unit(digest[0]) * 0.009, lng: unit(digest[1]) * 0.014 };
};

export const geocodeFixture = (input: GeocodeInput): GeocodeResult | null => {
  const locality = key(input.locality);
  const center = LOCALITIES[locality];
  if (center === undefined) return null;
  const district = locality === "київ" ? KYIV_DISTRICTS[key(input.district)] : undefined;
  const base = district ?? center;
  const street = key(input.street);
  const house = key(input.house);

  if (street === "") return { ...base, precision: district === undefined ? "locality" : "district" };
  const offset = offsetFor(`${locality}|${street}|${house}`);
  return {
    lat: base.lat + offset.lat,
    lng: base.lng + offset.lng,
    precision: house === "" ? "street" : "house",
  };
};
