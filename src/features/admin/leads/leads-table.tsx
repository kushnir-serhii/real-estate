import { formatPhoneInput } from "@/features/leads/phone";
import Link from "next/link";

import type { AdminLeadFilters, AdminLeadListItem } from "@/lib/db/admin-leads";
import { cn } from "@/lib/utils";
import { DeliveryBadge } from "./delivery-badge";
import { LeadDateTime } from "./lead-date-time";
import { LEAD_KIND_LABELS } from "./lead-kind-labels";
import { isLeadFailed, leadHref } from "./leads-params";

type LeadsTableProps = {
  leads: AdminLeadListItem[];
  /** Current list filters, kept in the detail link for the way back. */
  filters?: AdminLeadFilters;
  className?: string;
};

const TH_CLASS = "px-4 py-3 text-left font-medium";
const TD_CLASS = "px-4 py-3";

/**
 * Desktop list. One real link per row (the client's name) stretched over the whole row, so
 * keyboard and screen readers get one stop per lead.
 */
export const LeadsTable = ({ leads, filters, className }: LeadsTableProps) => (
  <div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
    <table className="w-full table-fixed text-sm">
      <caption className="sr-only">Заявки, спочатку нові</caption>
      <thead className="bg-muted/60 text-muted-foreground">
        <tr>
          <th scope="col" className={cn(TH_CLASS, "w-32")}>
            Дата
          </th>
          <th scope="col" className={cn(TH_CLASS, "w-40")}>
            Тип
          </th>
          <th scope="col" className={cn(TH_CLASS, "w-56")}>
            Клієнт
          </th>
          <th scope="col" className={TH_CLASS}>
            Об&apos;єкт
          </th>
          <th scope="col" className={cn(TH_CLASS, "w-32")}>
            Plektan
          </th>
          <th scope="col" className={cn(TH_CLASS, "w-32")}>
            Telegram
          </th>
        </tr>
      </thead>
      <tbody>
        {leads.map((lead) => (
          <tr
            key={lead.id}
            className={cn(
              "relative border-t align-top transition-colors hover:bg-muted/50",
              isLeadFailed(lead) && "bg-destructive/5 hover:bg-destructive/10",
            )}
          >
            <td className={TD_CLASS}>
              <LeadDateTime iso={lead.created_at} layout="stacked" />
            </td>
            <td className={TD_CLASS}>{LEAD_KIND_LABELS[lead.kind]}</td>
            <td className={TD_CLASS}>
              <Link
                href={leadHref(lead.id, filters)}
                prefetch={false}
                title={lead.name}
                className="block truncate font-medium outline-none after:absolute after:inset-0 focus-visible:after:ring-3 focus-visible:after:ring-ring/50 focus-visible:after:ring-inset"
              >
                {lead.name}
              </Link>
              <span className="block truncate text-muted-foreground tabular-nums">{formatPhoneInput(lead.phone)}</span>
            </td>
            <td className={TD_CLASS}>
              {lead.property ? (
                <span className="block truncate" title={lead.property.title}>
                  {lead.property.title}
                </span>
              ) : (
                <>
                  <span aria-hidden="true" className="text-muted-foreground">
                    —
                  </span>
                  <span className="sr-only">Без об&apos;єкта</span>
                </>
              )}
            </td>
            <td className={TD_CLASS}>
              <DeliveryBadge status={lead.plektan_status} />
            </td>
            <td className={TD_CLASS}>
              <DeliveryBadge status={lead.telegram_status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
