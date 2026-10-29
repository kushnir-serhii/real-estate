import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ExternalLink } from "@/features/admin/leads/external-link";
import { PropertyUpdatedAt } from "@/features/admin/properties/property-updated-at";
import { PAGE_PATHS } from "@/features/pages/page-paths";
import type { AdminPage } from "@/lib/db/admin-pages";
import { cn } from "@/lib/utils";
import { ADMIN_PAGES_PATH, PAGE_NAMES } from "./page-labels";
import { PageStatusChips } from "./page-status-chips";

type PageEditHeaderProps = { page: AdminPage };

/** Back link, the page name, its status, the public link and the last save. */
export const PageEditHeader = ({ page }: PageEditHeaderProps) => (
  <div className="flex flex-col gap-4">
    <Link href={ADMIN_PAGES_PATH} className={cn(buttonVariants({ variant: "ghost" }), "-ml-3 self-start")}>
      <ArrowLeft aria-hidden="true" />
      До списку сторінок
    </Link>
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold text-balance wrap-anywhere sm:text-3xl">{PAGE_NAMES[page.slug]}</h1>
      <PageStatusChips page={{ state: page.state, noindex: page.content.noindex, is_draft: page.content.is_draft }} />
      <div className="flex flex-wrap items-center gap-x-4 text-sm text-muted-foreground">
        <ExternalLink href={PAGE_PATHS[page.slug]}>Відкрити на сайті</ExternalLink>
        {page.updated_at ? (
          <PropertyUpdatedAt iso={page.updated_at} layout="inline" />
        ) : (
          <span>Зараз на сайті стандартний текст</span>
        )}
      </div>
    </div>
  </div>
);
