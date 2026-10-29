import "server-only";

import { X } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { getAdminProperties } from "@/lib/db/admin-properties";
import type { AdminPropertyFilters, AdminPropertyPage } from "@/lib/db/admin-properties";
import type { PropertiesMode } from "@/lib/db/property-permissions";
import { PropertiesEmpty } from "./properties-empty";
import { propertiesCountLabel } from "./properties-count-label";
import { PropertiesPagination } from "./properties-pagination";
import { ADMIN_PROPERTIES_PATH, hasActivePropertyFilters, propertiesHref } from "./properties-params";
import { PropertiesTable } from "./properties-table";
import { PropertyCards } from "./property-cards";

type PropertiesResultsProps = { filters: AdminPropertyFilters; mode: PropertiesMode };

type ResultsState =
  | { kind: "ready"; page: AdminPropertyPage }
  | { kind: "none" }
  | { kind: "filtered" }
  | { kind: "out-of-range"; total: number };

const toState = (page: AdminPropertyPage, filtered: boolean): ResultsState => {
  if (page.items.length > 0) return { kind: "ready", page };
  if (page.total > 0) return { kind: "out-of-range", total: page.total };
  return filtered ? { kind: "filtered" } : { kind: "none" };
};

type SummaryProps = { total: number; filtered: boolean };

/** «Знайдено N об'єктів» (or «Усього …» without filters) + «Скинути фільтри» when anything is filtered. */
const Summary = ({ total, filtered }: SummaryProps) => (
  <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-2">
    <p role="status" className="text-sm text-muted-foreground">
      {filtered ? "Знайдено" : "Усього"}{" "}
      <span className="font-medium text-foreground tabular-nums">{propertiesCountLabel(total)}</span>
    </p>
    {filtered && (
      <Link href={ADMIN_PROPERTIES_PATH} className={buttonVariants({ variant: "ghost" })}>
        <X aria-hidden="true" />
        Скинути фільтри
      </Link>
    )}
  </div>
);

/** Loads one page of properties; a failed query throws to the route's `error.tsx`. */
export const PropertiesResults = async ({ filters, mode }: PropertiesResultsProps) => {
  const filtered = hasActivePropertyFilters(filters);
  const page = await getAdminProperties(filters);
  const state = toState(page, filtered);

  switch (state.kind) {
    case "ready":
      return (
        <div className="flex flex-col gap-4">
          <Summary total={state.page.total} filtered={filtered} />
          <h2 className="sr-only">Список об&apos;єктів</h2>
          <PropertiesTable properties={state.page.items} className="hidden lg:block" />
          <PropertyCards properties={state.page.items} className="lg:hidden" />
          <div className="pt-2">
            <PropertiesPagination filters={filters} pageCount={state.page.pageCount} />
          </div>
        </div>
      );
    case "none":
      return <PropertiesEmpty kind="none" mode={mode} />;
    case "filtered":
      return (
        <div className="flex flex-col gap-4">
          <Summary total={0} filtered />
          <PropertiesEmpty kind="filtered" resetHref={ADMIN_PROPERTIES_PATH} />
        </div>
      );
    case "out-of-range":
      return (
        <div className="flex flex-col gap-4">
          <Summary total={state.total} filtered={filtered} />
          <PropertiesEmpty kind="out-of-range" firstPageHref={propertiesHref(filters, { page: 1 })} />
        </div>
      );
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
};
