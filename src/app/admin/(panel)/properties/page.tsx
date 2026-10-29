import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AddPropertyAction } from "@/features/admin/properties/add-property-action";
import { PropertiesFilters } from "@/features/admin/properties/properties-filters";
import { propertiesHref } from "@/features/admin/properties/properties-params";
import { PropertiesResults } from "@/features/admin/properties/properties-results";
import { PropertiesSkeleton } from "@/features/admin/properties/properties-skeleton";
import { adminPropertiesSearchParams, parseAdminPropertyFilters } from "@/lib/db/admin-property-filters";
import type { AdminPropertySearchParams } from "@/lib/db/admin-property-filters";
import { getSettings } from "@/lib/db/settings";

export const metadata: Metadata = { title: "Об'єкти" };

type AdminPropertiesPageProps = { searchParams: Promise<AdminPropertySearchParams> };

/** The GET form submits every field, also defaults (`q=&status=all`). */
const hasDefaultValues = (params: AdminPropertySearchParams) =>
  Object.values(params).some((v) => (Array.isArray(v) ? v.some((x) => x === "" || x === "all") : v === "" || v === "all"));

// The panel layout checks the admin session before this renders (same as the leads page).
const AdminPropertiesPage = async ({ searchParams }: AdminPropertiesPageProps) => {
  const params = await searchParams;
  const filters = parseAdminPropertyFilters(params);
  // Clean shareable URL after a form submit; `redirect` replaces the history entry.
  if (hasDefaultValues(params)) redirect(propertiesHref(filters));
  const { properties_source: mode } = await getSettings();
  // Remount the uncontrolled form and the results when the URL changes.
  const query = adminPropertiesSearchParams(filters).toString();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-2xl font-bold sm:text-3xl">Об&apos;єкти</h1>
        <AddPropertyAction mode={mode} />
      </div>
      <PropertiesFilters key={`filters-${query}`} filters={filters} />
      <Suspense key={`results-${query}`} fallback={<PropertiesSkeleton />}>
        <PropertiesResults filters={filters} mode={mode} />
      </Suspense>
    </div>
  );
};

export default AdminPropertiesPage;
