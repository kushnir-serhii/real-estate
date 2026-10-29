export type LlmErrorDetails =
  | { kind: "http"; message: string; status: number }
  | { kind: "timeout"; message: string }
  | { kind: "network"; message: string }
  | { kind: "parse"; message: string };

export type LlmErrorKind = LlmErrorDetails["kind"];

/** Every failure of the LLM client. Never contains the API key, the prompt or the provider's response body. */
export class LlmError extends Error {
  readonly details: LlmErrorDetails;

  constructor(details: LlmErrorDetails) {
    super(`LLM ${details.kind}: ${details.message}`);
    this.name = "LlmError";
    this.details = details;
  }

  get kind(): LlmErrorKind {
    return this.details.kind;
  }
}

export const isLlmError = (error: unknown): error is LlmError => error instanceof LlmError;
