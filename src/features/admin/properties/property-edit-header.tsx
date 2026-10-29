import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ExternalLink } from "@/features/admin/leads/external-link";
import type { AdminListStatus } from "@/lib/db/admin-property-filters";
import type { AdminProperty } from "@/lib/db/admin-properties";
import { cn } from "@/lib/utils";
import { ListStatusBadge } from "./list-status-badge";
import { ADMIN_PROPERTIES_PATH } from "./properties-params";
import { PropertySourceLabel } from "./property-source-label";

type PropertyEditHeaderProps = {
  property: Pick<AdminProperty, "title" | "source" | "external_id">;
  status: AdminListStatus;
  /** `/catalog/<slug>` when the page is live (published or the «sold» window), else null. */
  siteHref: string | null;
};

/** Back link, the title (wraps however long), status, origin and the link to the public page. */
export const PropertyEditHeader = ({ property, status, siteHref }: PropertyEditHeaderProps) => (
  <div className="flex flex-col gap-4">
    <Link href={ADMIN_PROPERTIES_PATH} className={cn(buttonVariants({ variant: "ghost" }), "-ml-3 self-start")}>
      <ArrowLeft aria-hidden="true" />
      До списку об&apos;єктів
    </Link>
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold text-balance wrap-anywhere sm:text-3xl">{property.title || "Без назви"}</h1>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <ListStatusBadge status={status} />
        <span>
          Джерело: <PropertySourceLabel property={property} className="text-foreground" />
        </span>
        {siteHref && <ExternalLink href={siteHref}>Відкрити на сайті</ExternalLink>}
      </div>
    </div>
  </div>
);
