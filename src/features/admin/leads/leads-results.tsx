import "server-only";

import { X } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { getAdminLeads } from "@/lib/db/admin-leads";
import type { AdminLeadFilters, AdminLeadPage } from "@/lib/db/admin-leads";
import { LeadCards } from "./lead-cards";
import { LeadsEmpty } from "./leads-empty";
import { leadsCountLabel } from "./leads-count-label";
import { LeadsPagination } from "./leads-pagination";
import { ADMIN_LEADS_PATH, hasActiveLeadFilters, leadsHref } from "./leads-params";
import { LeadsTable } from "./leads-table";

type LeadsResultsProps = { filters: AdminLeadFilters };

type ResultsState =
  | { kind: "ready"; page: AdminLeadPage }
  | { kind: "none" }
  | { kind: "filtered" }
  | { kind: "out-of-range"; total: number };

const toState = (page: AdminLeadPage, filtered: boolean): ResultsState => {
  if (page.items.length > 0) return { kind: "ready", page };
  if (page.total > 0) return { kind: "out-of-range", total: page.total };
  return filtered ? { kind: "filtered" } : { kind: "none" };
};

type SummaryProps = { total: number; filtered: boolean };

/** «Знайдено N заявок» + «Скинути фільтри» when anything is filtered. */
const Summary = ({ total, filtered }: SummaryProps) => (
  <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-2">
    <p className="text-sm text-muted-foreground">
      Знайдено <span className="font-medium text-foreground tabular-nums">{leadsCountLabel(total)}</span>
    </p>
    {filtered && (
      <Link href={ADMIN_LEADS_PATH} className={buttonVariants({ variant: "ghost" })}>
        <X aria-hidden="true" />
        Скинути фільтри
      </Link>
    )}
  </div>
);

/** Loads one page of leads; a failed query throws to the route's `error.tsx`. */
export const LeadsResults = async ({ filters }: LeadsResultsProps) => {
  const filtered = hasActiveLeadFilters(filters);
  const page = await getAdminLeads(filters);
  const state = toState(page, filtered);

  switch (state.kind) {
    case "ready":
      return (
        <div className="flex flex-col gap-4">
          <Summary total={state.page.total} filtered={filtered} />
          <h2 className="sr-only">Список заявок</h2>
          <LeadsTable leads={state.page.items} filters={filters} className="hidden lg:block" />
          <LeadCards leads={state.page.items} filters={filters} className="lg:hidden" />
          <div className="pt-2">
            <LeadsPagination filters={filters} pageCount={state.page.pageCount} />
          </div>
        </div>
      );
    case "none":
      return <LeadsEmpty kind="none" />;
    case "filtered":
      return (
        <div className="flex flex-col gap-4">
          <Summary total={0} filtered />
          <LeadsEmpty kind="filtered" resetHref={ADMIN_LEADS_PATH} />
        </div>
      );
    case "out-of-range":
      return (
        <div className="flex flex-col gap-4">
          <Summary total={state.total} filtered={filtered} />
          <LeadsEmpty kind="out-of-range" firstPageHref={leadsHref(filters, { page: 1 })} />
        </div>
      );
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
};
