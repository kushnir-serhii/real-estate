import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { pageItems } from "@/features/catalog/catalog-pagination";
import { cn } from "@/lib/utils";
import { blogHref } from "./blog-params";
import type { BlogState } from "./blog-params";

const ARROW_CLASS = buttonVariants({ variant: "outline", size: "icon" });

export const BlogPagination = ({ state, pageCount }: { state: BlogState; pageCount: number }) => {
  if (pageCount <= 1) return null;
  const current = state.page;
  const prev = current > 1 ? blogHref(state, { page: current - 1 }) : null;
  const next = current < pageCount ? blogHref(state, { page: current + 1 }) : null;

  return (
    <nav aria-label="Сторінки" className="flex items-center justify-center gap-2 pt-2">
      {prev ? (
        <Link href={prev} rel="prev" aria-label="Попередня сторінка" className={ARROW_CLASS}>
          <ChevronLeft />
        </Link>
      ) : (
        <span aria-hidden="true" className={cn(ARROW_CLASS, "opacity-40")}>
          <ChevronLeft />
        </span>
      )}

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
                href={blogHref(state, { page: item.page })}
                aria-current={item.page === current ? "page" : undefined}
                aria-label={`Сторінка ${item.page}`}
                className={cn(
                  buttonVariants({ variant: item.page === current ? "default" : "ghost", size: "icon" }),
                  "font-semibold tabular-nums",
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
