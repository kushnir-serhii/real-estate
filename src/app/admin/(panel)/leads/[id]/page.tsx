import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { LeadContactCard } from "@/features/admin/leads/lead-contact-card";
import { LeadDeliveryCard } from "@/features/admin/leads/lead-delivery-card";
import { LeadDetailHeader } from "@/features/admin/leads/lead-detail-header";
import { LeadRequestCard } from "@/features/admin/leads/lead-request-card";
import { LeadSourceCard } from "@/features/admin/leads/lead-source-card";
import { leadsHref } from "@/features/admin/leads/leads-params";
import { parseAdminLeadFilters } from "@/lib/db/admin-lead-filters";
import type { AdminLeadSearchParams } from "@/lib/db/admin-lead-filters";
import { getAdminLead } from "@/lib/db/admin-leads";

type AdminLeadPageProps = {
  params: Promise<{ id: string }>;
  /** The list's filters, carried over from the list for «До списку заявок». */
  searchParams: Promise<AdminLeadSearchParams>;
};

/** One query per request for the metadata and the page. */
const loadLead = cache(getAdminLead);

const TITLE_NAME_MAX = 40;

const shortName = (name: string) =>
  name.length > TITLE_NAME_MAX ? `${name.slice(0, TITLE_NAME_MAX).trimEnd()}…` : name;

export const generateMetadata = async ({ params }: AdminLeadPageProps): Promise<Metadata> => {
  const { id } = await params;
  const lead = await loadLead(id);
  return { title: lead ? `Заявка — ${shortName(lead.name)}` : "Заявку не знайдено" };
};

const AdminLeadPage = async ({ params, searchParams }: AdminLeadPageProps) => {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const lead = await loadLead(id);
  if (!lead) notFound();

  return (
    <div className="flex flex-col gap-6">
      <LeadDetailHeader lead={lead} backHref={leadsHref(parseAdminLeadFilters(query))} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="flex min-w-0 flex-col gap-6">
          <LeadContactCard lead={lead} />
          <LeadRequestCard lead={lead} />
          <LeadSourceCard lead={lead} />
        </div>
        <LeadDeliveryCard lead={lead} />
      </div>
    </div>
  );
};

export default AdminLeadPage;
