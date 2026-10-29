export type RetryChannel = "plektan" | "telegram";

export type RetryLeadState =
  | { status: "idle" }
  | { status: "sent"; channel: RetryChannel }
  | { status: "failed"; channel: RetryChannel; error: string }
  | { status: "skipped"; channel: RetryChannel }
  | { status: "not_due"; channel: RetryChannel }
  | { status: "error"; message: string };

export const INITIAL_RETRY_LEAD_STATE: RetryLeadState = { status: "idle" };
