import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { AdminLeadDetail } from "@/lib/db/admin-leads";
import { cn } from "@/lib/utils";
import { DeliveryBadge } from "./delivery-badge";
import { LeadDateTime } from "./lead-date-time";
import { LEAD_KIND_LABELS } from "./lead-kind-labels";
import { isLeadFailed } from "./leads-params";

type LeadDetailHeaderProps = {
  lead: Pick<AdminLeadDetail, "name" | "kind" | "created_at" | "plektan_status" | "telegram_status">;
  backHref: string;
};

/** Back link, client's name (wraps however long), kind, time and both delivery badges at a glance. */
export const LeadDetailHeader = ({ lead, backHref }: LeadDetailHeaderProps) => (
  <div className="flex flex-col gap-4">
    <Link href={backHref} className={cn(buttonVariants({ variant: "ghost" }), "-ml-3 self-start")}>
      <ArrowLeft aria-hidden="true" />
      До списку заявок
    </Link>
    <div className="flex flex-col gap-2">
      <p className="flex flex-wrap gap-x-2 text-sm text-muted-foreground">
        <span>{LEAD_KIND_LABELS[lead.kind]}</span>
        <span aria-hidden="true">·</span>
        <LeadDateTime iso={lead.created_at} layout="inline" />
      </p>
      <h1 className="text-2xl font-bold text-balance wrap-anywhere sm:text-3xl">{lead.name}</h1>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <DeliveryBadge channel="Plektan" status={lead.plektan_status} />
        <DeliveryBadge channel="Telegram" status={lead.telegram_status} />
        {/* On one column the delivery card is far below; jump to it when something failed. */}
        {isLeadFailed(lead) && (
          <a
            href="#delivery"
            className="inline-flex min-h-11 items-center rounded-sm text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 lg:hidden"
          >
            Що з доставкою?
          </a>
        )}
      </div>
    </div>
  </div>
);
