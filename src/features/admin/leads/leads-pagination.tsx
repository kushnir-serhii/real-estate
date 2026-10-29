import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { AdminLeadFilters } from "@/lib/db/admin-lead-filters";
import { cn } from "@/lib/utils";
import { leadsHref } from "./leads-params";

type LeadsPaginationProps = { filters: AdminLeadFilters; pageCount: number };

// Phones: icon-only 44px squares; wider: icon + word.
const STEP_CLASS = cn(buttonVariants({ variant: "outline" }), "max-sm:w-11 max-sm:px-0");

type StepProps = { href: string | null; rel: "prev" | "next"; label: string; children: React.ReactNode };

const Step = ({ href, rel, label, children }: StepProps) =>
  href ? (
    <Link href={href} rel={rel} aria-label={label} className={STEP_CLASS}>
      {children}
    </Link>
  ) : (
    <span aria-hidden="true" className={cn(STEP_CLASS, "pointer-events-none opacity-40")}>
      {children}
    </span>
  );

/** Previous / next + «Сторінка X з Y». Hidden when everything fits on one page. */
export const LeadsPagination = ({ filters, pageCount }: LeadsPaginationProps) => {
  if (pageCount <= 1) return null;
  const current = filters.page;
  const prev = current > 1 ? leadsHref(filters, { page: current - 1 }) : null;
  const next = current < pageCount ? leadsHref(filters, { page: current + 1 }) : null;

  return (
    <nav aria-label="Сторінки" className="flex items-center justify-center gap-3">
      <Step href={prev} rel="prev" label="Попередня сторінка">
        <ChevronLeft aria-hidden="true" />
        <span className="max-sm:sr-only">Попередня</span>
      </Step>
      <p className="text-sm tabular-nums">
        Сторінка {current} з {pageCount}
      </p>
      <Step href={next} rel="next" label="Наступна сторінка">
        <span className="max-sm:sr-only">Наступна</span>
        <ChevronRight aria-hidden="true" />
      </Step>
    </nav>
  );
};
