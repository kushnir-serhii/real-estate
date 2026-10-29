import Link from "next/link";

import type { AdminPropertyListItem } from "@/lib/db/admin-properties";
import { cn } from "@/lib/utils";
import { ListStatusBadge } from "./list-status-badge";
import { propertyHref } from "./properties-params";
import { propertyAddress, propertyPrice } from "./property-row-text";
import { PropertySourceLabel } from "./property-source-label";
import { PropertyThumb } from "./property-thumb";
import { PropertyUpdatedAt } from "./property-updated-at";

type PropertiesTableProps = { properties: AdminPropertyListItem[]; className?: string };

const TH_CLASS = "px-4 py-3 text-left font-medium";
const TD_CLASS = "px-4 py-3";

/**
 * Desktop list. One real link per row (the title) stretched over the whole row, so keyboard and
 * screen readers get one stop per property.
 */
export const PropertiesTable = ({ properties, className }: PropertiesTableProps) => (
  <div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
    <table className="w-full table-fixed text-sm">
      <caption className="sr-only">Об&apos;єкти, спочатку нещодавно змінені</caption>
      <thead className="bg-muted/60 text-muted-foreground">
        <tr>
          <th scope="col" className={cn(TH_CLASS, "w-24")}>
            <span className="sr-only">Фото</span>
          </th>
          <th scope="col" className={TH_CLASS}>
            Об&apos;єкт
          </th>
          <th scope="col" className={cn(TH_CLASS, "w-40")}>
            Ціна
          </th>
          <th scope="col" className={cn(TH_CLASS, "w-40")}>
            Статус
          </th>
          <th scope="col" className={cn(TH_CLASS, "w-48")}>
            Джерело
          </th>
          <th scope="col" className={cn(TH_CLASS, "w-32")}>
            Оновлено
          </th>
        </tr>
      </thead>
      <tbody>
        {properties.map((property) => {
          const address = propertyAddress(property);
          const price = propertyPrice(property);
          return (
            <tr key={property.id} className="relative border-t align-top transition-colors hover:bg-muted/50">
              <td className={cn(TD_CLASS, "py-2")}>
                <PropertyThumb cover={property.cover} size="sm" />
              </td>
              <td className={TD_CLASS}>
                <Link
                  href={propertyHref(property.id)}
                  prefetch={false}
                  title={property.title}
                  className="block truncate font-medium outline-none after:absolute after:inset-0 focus-visible:after:ring-3 focus-visible:after:ring-ring/50 focus-visible:after:ring-inset"
                >
                  {property.title}
                </Link>
                <span className="block truncate text-muted-foreground" title={address ?? undefined}>
                  {address ?? "Адресу не вказано"}
                </span>
              </td>
              <td className={cn(TD_CLASS, "font-medium tabular-nums")}>
                <span className="block truncate" title={price}>
                  {price}
                </span>
              </td>
              <td className={TD_CLASS}>
                <ListStatusBadge status={property.listStatus} />
              </td>
              <td className={TD_CLASS}>
                <PropertySourceLabel property={property} className="block truncate" />
              </td>
              <td className={TD_CLASS}>
                <PropertyUpdatedAt iso={property.updated_at} layout="stacked" />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
