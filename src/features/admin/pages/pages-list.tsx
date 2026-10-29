import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ExternalLink } from "@/features/admin/leads/external-link";
import { PropertyUpdatedAt } from "@/features/admin/properties/property-updated-at";
import { PAGE_PATHS } from "@/features/pages/page-paths";
import type { AdminPageListItem } from "@/lib/db/admin-pages";
import { cn } from "@/lib/utils";
import { PAGE_NAMES, adminPageHref } from "./page-labels";
import { PageStatusChips } from "./page-status-chips";

type PagesListProps = { pages: readonly AdminPageListItem[] };

/** The four fixed pages as cards (same layout from 375px up; there are never more). */
export const PagesList = ({ pages }: PagesListProps) => (
  <ul className="flex flex-col gap-4">
    {pages.map((page) => {
      const href = adminPageHref(page.slug);
      const path = PAGE_PATHS[page.slug];
      return (
        <li
          key={page.slug}
          className="flex min-w-0 flex-col gap-3 rounded-xl bg-card p-4 text-card-foreground ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:gap-6 sm:p-6"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h2 className="text-lg font-bold">
              <Link
                href={href}
                className="inline-flex min-h-11 items-center rounded-sm outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {PAGE_NAMES[page.slug]}
              </Link>
            </h2>
            <p className="truncate text-sm text-muted-foreground" title={page.title}>
              Заголовок: <span className="text-foreground">{page.title}</span>
            </p>
            <PageStatusChips page={page} />
            <div className="flex flex-wrap items-center gap-x-4 text-sm text-muted-foreground">
              <span className="font-mono text-foreground">{path}</span>
              <ExternalLink href={path}>Відкрити на сайті</ExternalLink>
              {page.updated_at ? (
                <PropertyUpdatedAt iso={page.updated_at} layout="inline" />
              ) : (
                <span>Стандартний текст</span>
              )}
            </div>
          </div>
          <Link href={href} className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}>
            Редагувати
            <ChevronRight aria-hidden="true" />
          </Link>
        </li>
      );
    })}
  </ul>
);
