export type GeocodeInput = {
  locality: string | null;
  district: string | null;
  street: string | null;
  house: string | null;
};

export type GeocodePrecision = "house" | "street" | "district" | "locality";

/** Coordinates are already rounded to 3 decimals (~100 m). */
export type GeocodeResult = { lat: number; lng: number; precision: GeocodePrecision };
