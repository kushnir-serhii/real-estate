export type PlektanErrorDetails =
  | { kind: "network"; message: string }
  | { kind: "http"; message: string; status: number }
  | { kind: "invalid_response"; message: string; issues: string[] }
  | { kind: "api"; message: string };

export type PlektanErrorKind = PlektanErrorDetails["kind"];

/** Every failure of the Plektan client. Never contains the API key or response bodies. */
export class PlektanError extends Error {
  readonly details: PlektanErrorDetails;

  constructor(details: PlektanErrorDetails) {
    super(`Plektan ${details.kind}: ${details.message}`);
    this.name = "PlektanError";
    this.details = details;
  }

  get kind(): PlektanErrorKind {
    return this.details.kind;
  }
}

export const isPlektanError = (error: unknown): error is PlektanError =>
  error instanceof PlektanError;
