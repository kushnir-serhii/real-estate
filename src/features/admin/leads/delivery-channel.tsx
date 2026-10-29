import { MAX_DELIVERY_ATTEMPTS } from "@/features/leads/retry-schedule";
import { DeliveryBadge } from "./delivery-badge";
import type { DeliveryStatus } from "./delivery-badge";
import { describeDeliveryError } from "./describe-delivery-error";
import { LeadDateTime } from "./lead-date-time";
import { LeadFacts } from "./lead-facts";
import type { LeadFact } from "./lead-facts";
import type { RetryChannel } from "./retry-state";
import { RetryDelivery } from "./retry-delivery";

type DeliveryChannelProps = {
  leadId: string;
  channel: RetryChannel;
  status: DeliveryStatus;
  attempts: number;
  error: string | null;
  nextAttemptAt: string | null;
  /** Plektan only. */
  itemId?: string | null;
  /** Plektan only: when the manager was told in Telegram that Plektan gave up. */
  alertedAt?: string | null;
};

const SERVICE: Record<RetryChannel, string> = { plektan: "Plektan", telegram: "Telegram" };

const SUMMARY: Record<Exclude<DeliveryStatus, "failed">, Record<RetryChannel, string>> = {
  sent: {
    plektan: "Заявка є в Plektan.",
    telegram: "Менеджер отримав повідомлення в Telegram.",
  },
  pending: {
    plektan: "Ще надсилається. Сайт спробує сам, нічого робити не треба.",
    telegram: "Ще надсилається. Сайт спробує сам, нічого робити не треба.",
  },
  skipped: {
    plektan: "Канал вимкнено (немає ключів). Заявка збережена тут, у адмінці.",
    telegram: "Канал вимкнено (немає ключів). Заявка збережена тут, у адмінці.",
  },
};

const attemptsText = (attempts: number): string =>
  attempts > MAX_DELIVERY_ATTEMPTS
    ? `${attempts} (більше за ліміт ${MAX_DELIVERY_ATTEMPTS} — через повтори вручну)`
    : `${attempts} з ${MAX_DELIVERY_ATTEMPTS}`;

/** One delivery channel: status, attempts, what went wrong in plain words, what happens next, «Повторити». */
export const DeliveryChannel = ({
  leadId,
  channel,
  status,
  attempts,
  error,
  nextAttemptAt,
  itemId,
  alertedAt,
}: DeliveryChannelProps) => {
  const service = SERVICE[channel];
  const failed = status === "failed";
  const exhausted = failed && attempts >= MAX_DELIVERY_ATTEMPTS;
  const scheduled = nextAttemptAt !== null && (status === "failed" || status === "pending");

  const facts: LeadFact[] = [{ label: "Спроб", value: <span className="tabular-nums">{attemptsText(attempts)}</span> }];
  if (scheduled) {
    facts.push({ label: "Наступна спроба", value: <LeadDateTime iso={nextAttemptAt} layout="inline" /> });
  }
  if (itemId) {
    facts.push({ label: `№ заявки в ${service}`, value: <span className="tabular-nums">{itemId}</span> });
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{service}</h3>
        <DeliveryBadge status={status} className="text-sm" />
      </div>

      {failed ? (
        <div className="flex flex-col gap-1 rounded-lg bg-destructive/10 px-4 py-3 text-sm">
          <p className="font-medium wrap-anywhere text-destructive">{describeDeliveryError(channel, error)}</p>
          <p className="text-muted-foreground">
            {exhausted
              ? "Автоматичні спроби вичерпано: сайт більше не надсилатиме сам. Натисніть «Повторити», коли проблему усунуто."
              : "Сайт ще спробує надіслати сам. Можна не чекати й повторити зараз."}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{SUMMARY[status][channel]}</p>
      )}

      <LeadFacts facts={facts} />

      {alertedAt && (
        <p className="text-sm text-muted-foreground">
          Менеджера повідомлено в Telegram <LeadDateTime iso={alertedAt} layout="inline" />
        </p>
      )}

      <RetryDelivery leadId={leadId} channel={channel} canRetry={failed} />
    </div>
  );
};
