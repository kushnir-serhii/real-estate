import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CatalogFiltersForm } from "@/features/catalog/catalog-filters-form";
import {
  canonicalPath,
  catalogHref,
  catalogQuery,
  catalogTitle,
  countActiveFilters,
  isIndexable,
  parseCatalogState,
  toPropertyFilters,
} from "@/features/catalog/catalog-params";
import type { SearchParams } from "@/features/catalog/catalog-params";
import { CatalogResults } from "@/features/catalog/catalog-results";
import { CatalogSkeleton } from "@/features/catalog/catalog-skeleton";
import { CatalogSort } from "@/features/catalog/catalog-sort";
import { FiltersSheet } from "@/features/catalog/filters-sheet";
import { loadDistrictOptions } from "@/features/catalog/load-district-options";
import { getExchangeRates } from "@/lib/db/settings";

type CatalogPageProps = { searchParams: Promise<SearchParams> };

export const generateMetadata = async ({ searchParams }: CatalogPageProps): Promise<Metadata> => {
  const state = parseCatalogState(await searchParams);
  const title = catalogTitle(state);
  return {
    title: state.page > 1 ? `${title} — сторінка ${state.page}` : title,
    description: `${title} від агентства нерухомості: актуальні пропозиції з фото, цінами та фільтрами.`,
    alternates: { canonical: canonicalPath(state) },
    robots: isIndexable(state) ? undefined : { index: false, follow: true },
  };
};

/** The GET form submits every field, also empty ones (`price_from=`). */
const hasEmptyValues = (params: SearchParams) =>
  Object.values(params).some((v) => (Array.isArray(v) ? v.includes("") : v === ""));

const CatalogPage = async ({ searchParams }: CatalogPageProps) => {
  const params = await searchParams;
  const state = parseCatalogState(params);
  // Clean shareable URL after a form submit; `redirect` replaces the history entry, so back still works.
  if (hasEmptyValues(params)) redirect(catalogHref(state));
  const [rates, districts] = await Promise.all([getExchangeRates(), loadDistrictOptions()]);
  const filters = toPropertyFilters(state, rates);
  // Remount uncontrolled forms (and close the sheet) when the URL changes.
  const query = catalogQuery(state);
  const activeCount = countActiveFilters(state);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
      <h1 className="text-2xl font-bold text-balance sm:text-3xl">{catalogTitle(state)}</h1>

      <div className="mt-6 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        <aside aria-label="Фільтри" className="hidden rounded-xl bg-card p-4 ring-1 ring-foreground/10 lg:block">
          <CatalogFiltersForm key={query} state={state} districts={districts} idPrefix="filters-side" />
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="lg:hidden">
              <FiltersSheet key={query} activeCount={activeCount}>
                <CatalogFiltersForm state={state} districts={districts} idPrefix="filters-sheet" stickyActions />
              </FiltersSheet>
            </div>
            <div className="ml-auto">
              <CatalogSort key={query} state={state} />
            </div>
          </div>

          {/* Phones without JS can't open the sheet: show the form inline instead. */}
          <noscript>
            <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 lg:hidden">
              <CatalogFiltersForm state={state} districts={districts} idPrefix="filters-nojs" />
            </div>
          </noscript>

          <Suspense key={query} fallback={<CatalogSkeleton />}>
            <CatalogResults state={state} filters={filters} />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default CatalogPage;
