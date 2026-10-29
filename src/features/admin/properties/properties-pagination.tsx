import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { AdminPropertyFilters } from "@/lib/db/admin-property-filters";
import { cn } from "@/lib/utils";
import { propertiesHref } from "./properties-params";

type PropertiesPaginationProps = { filters: AdminPropertyFilters; pageCount: number };

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

/** Previous / next + «Сторінка X з Y», filters kept. Hidden when everything fits on one page. */
export const PropertiesPagination = ({ filters, pageCount }: PropertiesPaginationProps) => {
  if (pageCount <= 1) return null;
  const current = filters.page;
  const prev = current > 1 ? propertiesHref(filters, { page: current - 1 }) : null;
  const next = current < pageCount ? propertiesHref(filters, { page: current + 1 }) : null;

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
