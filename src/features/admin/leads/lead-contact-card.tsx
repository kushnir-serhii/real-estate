import { Mail, Phone } from "lucide-react";

import { formatPhoneInput } from "@/features/leads/phone";
import type { AdminLeadDetail } from "@/lib/db/admin-leads";
import { toTel } from "@/lib/format/to-tel";
import { cn } from "@/lib/utils";
import { LeadSection } from "./lead-section";

type LeadContactCardProps = { lead: Pick<AdminLeadDetail, "phone" | "email"> };

const LINK_CLASS =
  "inline-flex min-h-11 max-w-full items-center gap-2 rounded-sm outline-none underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50";

/** Phone (big, tap to call) and email. The stored phone stays in `tel:`; the text is grouped for reading. */
export const LeadContactCard = ({ lead }: LeadContactCardProps) => (
  <LeadSection id="contact" title="Контакт">
    <div className="flex flex-col gap-1">
      <a href={`tel:${toTel(lead.phone)}`} className={cn(LINK_CLASS, "text-xl font-semibold tabular-nums sm:text-2xl")}>
        <Phone className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">Зателефонувати: </span>
        {formatPhoneInput(lead.phone)}
      </a>
      {lead.email ? (
        <a href={`mailto:${lead.email}`} className={cn(LINK_CLASS, "text-base")}>
          <Mail className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Написати на пошту: </span>
          <span className="min-w-0 wrap-anywhere">{lead.email}</span>
        </a>
      ) : (
        <p className="flex min-h-11 items-center gap-2 text-muted-foreground">
          <Mail className="size-5 shrink-0" aria-hidden="true" />
          Пошту не вказано
        </p>
      )}
    </div>
  </LeadSection>
);
