import { adminPropertiesSearchParams } from "@/lib/db/admin-property-filters";
import type { AdminPropertyFilters } from "@/lib/db/admin-property-filters";

export const ADMIN_PROPERTIES_PATH = "/admin/properties";
export const NEW_PROPERTY_PATH = "/admin/properties/new";
export const ADMIN_SETTINGS_PATH = "/admin/settings";

/** `/admin/properties?…` for the current filters with overrides (defaults dropped, page reset on filter change). */
export const propertiesHref = (
  filters: AdminPropertyFilters,
  overrides: Partial<AdminPropertyFilters> = {},
): string => {
  const query = adminPropertiesSearchParams(filters, overrides).toString();
  return query ? `${ADMIN_PROPERTIES_PATH}?${query}` : ADMIN_PROPERTIES_PATH;
};

/** `/admin/properties/<id>` (the edit form, slice 3). */
export const propertyHref = (id: string): string => `${ADMIN_PROPERTIES_PATH}/${id}`;

export const hasActivePropertyFilters = (f: AdminPropertyFilters): boolean =>
  f.status !== "all" || f.source !== "all" || f.deal !== "all" || f.type !== "all" || Boolean(f.q);
