import type { AdminListStatus } from "@/lib/db/admin-property-filters";
import type { AdminProperty } from "@/lib/db/admin-properties";

/** Same rule as the list: hidden and never published = a draft. */
export const propertyListStatus = (p: Pick<AdminProperty, "status" | "published_at">): AdminListStatus => {
  if (p.status === "published") return "published";
  return p.published_at === null ? "draft" : "hidden";
};
