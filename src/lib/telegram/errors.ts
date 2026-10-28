export type TelegramErrorDetails =
  | { kind: "network"; message: string }
  | { kind: "http"; message: string; status: number }
  | { kind: "invalid_response"; message: string }
  | { kind: "api"; message: string };

export type TelegramErrorKind = TelegramErrorDetails["kind"];

/** Every failure of the Telegram client. Never contains the bot token (it lives in the URL), chat id or message text. */
export class TelegramError extends Error {
  readonly details: TelegramErrorDetails;

  constructor(details: TelegramErrorDetails) {
    super(`Telegram ${details.kind}: ${details.message}`);
    this.name = "TelegramError";
    this.details = details;
  }

  get kind(): TelegramErrorKind {
    return this.details.kind;
  }
}

export const isTelegramError = (error: unknown): error is TelegramError => error instanceof TelegramError;
