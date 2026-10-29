import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LeadsFilters } from "@/features/admin/leads/leads-filters";
import { leadsHref } from "@/features/admin/leads/leads-params";
import { LeadsResults } from "@/features/admin/leads/leads-results";
import { LeadsSkeleton } from "@/features/admin/leads/leads-skeleton";
import { adminLeadsSearchParams, parseAdminLeadFilters } from "@/lib/db/admin-lead-filters";
import type { AdminLeadSearchParams } from "@/lib/db/admin-lead-filters";

export const metadata: Metadata = { title: "Заявки" };

type AdminLeadsPageProps = { searchParams: Promise<AdminLeadSearchParams> };

/** The GET form submits every field, also empty ones (`q=&from=`). */
const hasEmptyValues = (params: AdminLeadSearchParams) =>
  Object.values(params).some((v) => (Array.isArray(v) ? v.includes("") : v === ""));

const AdminLeadsPage = async ({ searchParams }: AdminLeadsPageProps) => {
  const params = await searchParams;
  const filters = parseAdminLeadFilters(params);
  // Clean shareable URL after a form submit; `redirect` replaces the history entry.
  if (hasEmptyValues(params)) redirect(leadsHref(filters));
  // Remount the uncontrolled form and the results when the URL changes.
  const query = adminLeadsSearchParams(filters).toString();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold sm:text-3xl">Заявки</h1>
      <LeadsFilters key={`filters-${query}`} filters={filters} />
      <Suspense key={`results-${query}`} fallback={<LeadsSkeleton />}>
        <LeadsResults filters={filters} />
      </Suspense>
    </div>
  );
};

export default AdminLeadsPage;
