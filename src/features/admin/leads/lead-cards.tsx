import { formatPhoneInput } from "@/features/leads/phone";
import Link from "next/link";

import type { AdminLeadFilters, AdminLeadListItem } from "@/lib/db/admin-leads";
import { cn } from "@/lib/utils";
import { DeliveryBadge } from "./delivery-badge";
import { LeadDateTime } from "./lead-date-time";
import { LEAD_KIND_LABELS } from "./lead-kind-labels";
import { isLeadFailed, leadHref } from "./leads-params";

type LeadCardsProps = {
  leads: AdminLeadListItem[];
  /** Current list filters, kept in the detail link for the way back. */
  filters?: AdminLeadFilters;
  className?: string;
};

/** Phone/tablet list: same data as the table, one stretched link per card. */
export const LeadCards = ({ leads, filters, className }: LeadCardsProps) => (
  <ul className={cn("grid gap-3 md:grid-cols-2", className)}>
    {leads.map((lead) => (
      <li
        key={lead.id}
        className={cn(
          "relative flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
          isLeadFailed(lead) && "border-destructive/40 bg-destructive/5 hover:bg-destructive/10",
        )}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <LeadDateTime iso={lead.created_at} layout="inline" />
          <span>{LEAD_KIND_LABELS[lead.kind]}</span>
        </div>

        <div className="min-w-0">
          <Link
            href={leadHref(lead.id, filters)}
            prefetch={false}
            title={lead.name}
            className="block truncate text-base font-medium outline-none after:absolute after:inset-0 after:rounded-xl"
          >
            {lead.name}
          </Link>
          <span className="block truncate text-sm text-muted-foreground tabular-nums">{formatPhoneInput(lead.phone)}</span>
        </div>

        {lead.property && (
          <p className="truncate text-sm" title={lead.property.title}>
            <span className="text-muted-foreground">Об&apos;єкт: </span>
            {lead.property.title}
          </p>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <DeliveryBadge channel="Plektan" status={lead.plektan_status} />
          <DeliveryBadge channel="Telegram" status={lead.telegram_status} />
        </div>
      </li>
    ))}
  </ul>
);
