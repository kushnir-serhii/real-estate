import Link from "next/link";

import type { AdminPropertyListItem } from "@/lib/db/admin-properties";
import { cn } from "@/lib/utils";
import { ListStatusBadge } from "./list-status-badge";
import { propertyHref } from "./properties-params";
import { propertyAddress, propertyPrice } from "./property-row-text";
import { PropertySourceLabel } from "./property-source-label";
import { PropertyThumb } from "./property-thumb";
import { PropertyUpdatedAt } from "./property-updated-at";

type PropertyCardsProps = { properties: AdminPropertyListItem[]; className?: string };

/** Phone/tablet list: same data as the table, one stretched link per card. */
export const PropertyCards = ({ properties, className }: PropertyCardsProps) => (
  <ul className={cn("grid gap-3 md:grid-cols-2", className)}>
    {properties.map((property) => {
      const address = propertyAddress(property);
      return (
        <li
          key={property.id}
          className="relative flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
        >
          <div className="flex min-w-0 gap-3">
            <PropertyThumb cover={property.cover} size="md" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Link
                href={propertyHref(property.id)}
                prefetch={false}
                title={property.title}
                className="line-clamp-2 font-medium break-words outline-none after:absolute after:inset-0 after:rounded-xl"
              >
                {property.title}
              </Link>
              <span className="truncate text-sm text-muted-foreground" title={address ?? undefined}>
                {address ?? "Адресу не вказано"}
              </span>
            </div>
          </div>

          <p className="font-medium tabular-nums">{propertyPrice(property)}</p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
            <ListStatusBadge status={property.listStatus} />
            <PropertySourceLabel property={property} />
            <PropertyUpdatedAt iso={property.updated_at} layout="inline" />
          </div>
        </li>
      );
    })}
  </ul>
);
