"use client";

import { CircleAlert, CircleCheck, Info, LoaderCircle, RefreshCw } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { retryLeadDelivery } from "./actions";
import { INITIAL_RETRY_LEAD_STATE } from "./retry-state";
import type { RetryChannel, RetryLeadState } from "./retry-state";

type RetryDeliveryProps = {
  leadId: string;
  channel: RetryChannel;
  /** The channel is `failed` now. After a successful retry the page re-renders with `false`. */
  canRetry: boolean;
};

const SERVICE: Record<RetryChannel, string> = { plektan: "Plektan", telegram: "Telegram" };

type Result = { tone: "success" | "error" | "info"; text: string };

const resultOf = (state: RetryLeadState, channel: RetryChannel): Result | null => {
  const service = SERVICE[channel];
  switch (state.status) {
    case "idle":
    case "error":
      return null;
    case "sent":
      return { tone: "success", text: `Надіслано в ${service}` };
    case "failed":
      return { tone: "error", text: `Не вдалося: ${state.error}` };
    case "skipped":
      return { tone: "info", text: `${service} вимкнено (немає ключів), тож нічого не надіслано. Заявка збережена тут.` };
    case "not_due":
      return { tone: "info", text: "Повторювати вже не треба: статус доставки змінився, сторінку оновлено." };
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
};

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info } as const;
const TONES = { success: "text-success", error: "text-destructive", info: "text-muted-foreground" } as const;

/**
 * «Повторити» for one failed channel + the announced result. Stays mounted after a successful retry
 * (when the button is gone), so «Надіслано» is still shown and gets the focus the button had.
 */
export const RetryDelivery = ({ leadId, channel, canRetry }: RetryDeliveryProps) => {
  const [state, formAction, pending] = useActionState(retryLeadDelivery, INITIAL_RETRY_LEAD_STATE);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const result = resultOf(state, channel);

  // The button is disabled while sending, which drops the focus: give it back (or to the result
  // when the button is gone after a successful retry).
  useEffect(() => {
    if (state.status === "idle") return;
    if (canRetry) buttonRef.current?.focus();
    else statusRef.current?.focus();
  }, [canRetry, state]);

  if (!canRetry && state.status === "idle") return null;

  const Icon = result ? ICONS[result.tone] : null;

  return (
    <div className="flex flex-col items-start gap-2">
      {canRetry && (
        <form action={formAction}>
          <input type="hidden" name="id" value={leadId} />
          <input type="hidden" name="channel" value={channel} />
          <Button ref={buttonRef} type="submit" disabled={pending}>
            {pending ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw aria-hidden="true" />
            )}
            {pending ? "Надсилаємо…" : "Повторити"}
            <span className="sr-only"> надсилання в {SERVICE[channel]}</span>
          </Button>
        </form>
      )}

      <p
        ref={statusRef}
        role="status"
        tabIndex={-1}
        className={cn(
          "flex items-start gap-1.5 text-sm font-medium wrap-anywhere outline-none empty:hidden",
          pending ? "text-muted-foreground" : result && TONES[result.tone],
        )}
      >
        {pending ? `Надсилаємо в ${SERVICE[channel]}…` : result && Icon && (
          <>
            <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{result.text}</span>
          </>
        )}
      </p>

      {!pending && state.status === "error" && (
        <p role="alert" className="flex items-start gap-1.5 text-sm font-medium wrap-anywhere text-destructive">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {state.message}
        </p>
      )}
    </div>
  );
};
