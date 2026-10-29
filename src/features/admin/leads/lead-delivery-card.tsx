import type { AdminLeadDetail } from "@/lib/db/admin-leads";
import { DeliveryChannel } from "./delivery-channel";
import { LeadSection } from "./lead-section";

type LeadDeliveryCardProps = { lead: AdminLeadDetail; className?: string };

/** Delivery to Plektan and to the manager's Telegram, one block per channel. */
export const LeadDeliveryCard = ({ lead, className }: LeadDeliveryCardProps) => (
  <LeadSection id="delivery" title="Доставка" className={className}>
    <p className="-mt-2 text-sm text-muted-foreground">
      Заявка вже збережена на сайті. Тут видно, чи дійшла вона до CRM і менеджера.
    </p>
    <div className="flex flex-col gap-6 divide-y [&>*:not(:last-child)]:pb-6">
      <DeliveryChannel
        leadId={lead.id}
        channel="plektan"
        status={lead.plektan_status}
        attempts={lead.plektan_attempts}
        error={lead.plektan_error}
        nextAttemptAt={lead.plektan_next_attempt_at}
        itemId={lead.plektan_item_id}
        alertedAt={lead.plektan_alerted_at}
      />
      <DeliveryChannel
        leadId={lead.id}
        channel="telegram"
        status={lead.telegram_status}
        attempts={lead.telegram_attempts}
        error={lead.telegram_error}
        nextAttemptAt={lead.telegram_next_attempt_at}
      />
    </div>
  </LeadSection>
);
