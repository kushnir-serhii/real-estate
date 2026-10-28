import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { catalogHref } from "./catalog-params";
import type { CatalogState } from "./catalog-params";

type CatalogPaginationProps = { state: CatalogState; pageCount: number };

type Item = { kind: "page"; page: number } | { kind: "gap"; key: string };

/** 1 … 4 5 6 … 12: first, last, current ±1; a single hidden page is shown instead of «…». */
const pageItems = (current: number, count: number): Item[] => {
  const pages = new Set([1, count, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b);
  const items: Item[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev === 2) items.push({ kind: "page", page: p - 1 });
    else if (p - prev > 2) items.push({ kind: "gap", key: `gap-${p}` });
    items.push({ kind: "page", page: p });
    prev = p;
  }
  return items;
};

const ARROW_CLASS = buttonVariants({ variant: "outline", size: "icon" });

export const CatalogPagination = ({ state, pageCount }: CatalogPaginationProps) => {
  if (pageCount <= 1) return null;
  const current = state.page;
  const prev = current > 1 ? catalogHref(state, { page: current - 1 }) : null;
  const next = current < pageCount ? catalogHref(state, { page: current + 1 }) : null;

  return (
    <nav aria-label="Сторінки" className="flex items-center justify-center gap-2">
      {prev ? (
        <Link href={prev} rel="prev" aria-label="Попередня сторінка" className={ARROW_CLASS}>
          <ChevronLeft />
        </Link>
      ) : (
        <span aria-hidden="true" className={cn(ARROW_CLASS, "opacity-40")}>
          <ChevronLeft />
        </span>
      )}

      {/* Phones: a compact counter; wider screens: page numbers. */}
      <p className="px-2 text-sm tabular-nums sm:hidden">
        Сторінка {current} з {pageCount}
      </p>
      <ul className="hidden items-center gap-1 sm:flex">
        {pageItems(current, pageCount).map((item) =>
          item.kind === "gap" ? (
            <li key={item.key} aria-hidden="true" className="px-1 text-muted-foreground">
              …
            </li>
          ) : (
            <li key={item.page}>
              <Link
                href={catalogHref(state, { page: item.page })}
                aria-current={item.page === current ? "page" : undefined}
                aria-label={`Сторінка ${item.page}`}
                className={cn(
                  buttonVariants({ variant: item.page === current ? "default" : "ghost", size: "icon" }),
                  "tabular-nums",
                )}
              >
                {item.page}
              </Link>
            </li>
          ),
        )}
      </ul>

      {next ? (
        <Link href={next} rel="next" aria-label="Наступна сторінка" className={ARROW_CLASS}>
          <ChevronRight />
        </Link>
      ) : (
        <span aria-hidden="true" className={cn(ARROW_CLASS, "opacity-40")}>
          <ChevronRight />
        </span>
      )}
    </nav>
  );
};
