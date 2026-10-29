import type { AdminPropertyListItem } from "@/lib/db/admin-properties";
import { cn } from "@/lib/utils";

type PropertySourceLabelProps = {
  property: Pick<AdminPropertyListItem, "source" | "external_id">;
  className?: string;
};

/** «Plektan № 12345» or «Адмінка». */
export const PropertySourceLabel = ({ property, className }: PropertySourceLabelProps) => {
  switch (property.source) {
    case "plektan":
      return (
        <span className={cn("whitespace-nowrap tabular-nums", className)}>
          Plektan{property.external_id ? ` № ${property.external_id}` : ""}
        </span>
      );
    case "admin":
      return <span className={cn("whitespace-nowrap", className)}>Адмінка</span>;
    default: {
      const unreachable: never = property.source;
      return unreachable;
    }
  }
};
