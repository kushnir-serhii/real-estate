export type GeocodeErrorKind = "network" | "http" | "rate_limited" | "invalid_response";

/** Every failure of the geocoder client (a plain "address not found" is `null`, not an error). Never contains the address. */
export class GeocodeError extends Error {
  readonly kind: GeocodeErrorKind;

  constructor(kind: GeocodeErrorKind, message: string) {
    super(`Geocoder ${kind}: ${message}`);
    this.name = "GeocodeError";
    this.kind = kind;
  }
}

export const isGeocodeError = (error: unknown): error is GeocodeError => error instanceof GeocodeError;
