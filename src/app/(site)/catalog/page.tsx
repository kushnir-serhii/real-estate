import type { Metadata } from "next";
import { SlidersHorizontal } from "lucide-react";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { JsonLd } from "@/components/seo/json-ld";
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
import { CatalogSort } from "@/features/catalog/catalog-sort";
import { FiltersSheet } from "@/features/catalog/filters-sheet";
import { loadDistrictOptions } from "@/features/catalog/load-district-options";
import { CATALOG_PAGE } from "@/constants/inner-pages";
import { breadcrumbSchema, HOME_CRUMB } from "@/features/seo/schemas";
import { getExchangeRates } from "@/lib/db/settings";
import { getSiteUrl } from "@/lib/site-url";

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
    <div>
      <JsonLd
        data={breadcrumbSchema(getSiteUrl(), [HOME_CRUMB, { name: "Каталог", path: canonicalPath(state) }])}
      />
      <PageHeader eyebrow={CATALOG_PAGE.eyebrow} title={catalogTitle(state)} />

      <div className="site-container pb-16 sm:pb-24 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        <aside aria-label="Фільтри" className="hidden rounded-2xl bg-card p-5 ring-1 ring-foreground/10 lg:block">
          <p className="mb-5 flex items-center gap-2 font-heading text-2xl leading-tight font-semibold">
            <SlidersHorizontal className="size-4 text-dawn-text" aria-hidden="true" />
            Фільтри
          </p>
          <CatalogFiltersForm key={query} state={state} districts={districts} idPrefix="filters-side" />
        </aside>

        <div className="flex min-w-0 flex-col gap-5">
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

          {/* Phones without JS can't open the sheet: the root layout's <noscript> style reveals this form.
              Not a <noscript> itself: streamed React content inside it has no placeholders in the DOM, so `$RS` throws. */}
          <div className="nojs-only hidden">
            <div className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10 lg:hidden">
              <CatalogFiltersForm state={state} districts={districts} idPrefix="filters-nojs" />
            </div>
          </div>

          <CatalogResults state={state} filters={filters} />
        </div>
      </div>
    </div>
  );
};

export default CatalogPage;
