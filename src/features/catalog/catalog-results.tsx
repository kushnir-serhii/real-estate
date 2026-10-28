import "server-only";

import { PropertyCard } from "@/features/properties/property-card";
import { RetryButton } from "@/features/home/retry-button";
import { getPublishedProperties } from "@/lib/db/properties";
import type { PropertyFilters, PropertyPage } from "@/lib/db/properties";
import { getSupabasePublicEnvOrNull } from "@/lib/supabase/env";
import { CatalogEmpty } from "./catalog-empty";
import { CatalogGrid } from "./catalog-grid";
import { CatalogPagination } from "./catalog-pagination";
import { catalogHref, countActiveFilters, objectsLabel, resetHref } from "./catalog-params";
import type { CatalogState } from "./catalog-params";

type CatalogResultsProps = { state: CatalogState; filters: PropertyFilters };

type ResultsState =
  | { kind: "ready"; page: PropertyPage }
  | { kind: "empty" }
  | { kind: "out-of-range"; total: number }
  | { kind: "error" };

// Cards are narrower next to the sidebar: 1 column, 2 from sm, 3 from xl.
const CARD_SIZES = "(min-width: 1280px) 22rem, (min-width: 640px) 50vw, 100vw";

const load = async (filters: PropertyFilters): Promise<ResultsState> => {
  if (getSupabasePublicEnvOrNull() === null) return { kind: "empty" };
  try {
    const page = await getPublishedProperties(filters);
    if (page.items.length > 0) return { kind: "ready", page };
    return page.total > 0 ? { kind: "out-of-range", total: page.total } : { kind: "empty" };
  } catch (error) {
    console.error("catalog: failed to load properties", error instanceof Error ? error.message : error);
    return { kind: "error" };
  }
};

const Count = ({ total }: { total: number }) => (
  <p role="status" className="text-sm text-muted-foreground">
    Знайдено <span className="font-medium text-foreground tabular-nums">{objectsLabel(total)}</span>
  </p>
);

export const CatalogResults = async ({ state, filters }: CatalogResultsProps) => {
  const result = await load(filters);

  switch (result.kind) {
    case "ready":
      return (
        <div className="flex flex-col gap-4">
          <Count total={result.page.total} />
          <h2 className="sr-only">Результати</h2>
          <CatalogGrid>
            {result.page.items.map((property, i) => (
              <li key={property.id}>
                <PropertyCard property={property} imageSizes={CARD_SIZES} priority={i === 0} />
              </li>
            ))}
          </CatalogGrid>
          <div className="pt-4">
            <CatalogPagination state={state} pageCount={result.page.pageCount} />
          </div>
        </div>
      );
    case "empty":
      return (
        <div className="flex flex-col gap-4">
          <Count total={0} />
          {countActiveFilters(state) > 0 ? (
            <CatalogEmpty kind="filtered" resetHref={resetHref(state)} />
          ) : (
            <CatalogEmpty kind="nothing" />
          )}
        </div>
      );
    case "out-of-range":
      return (
        <div className="flex flex-col gap-4">
          <Count total={result.total} />
          <CatalogEmpty kind="out-of-range" firstPageHref={catalogHref(state, { page: 1 })} />
        </div>
      );
    case "error":
      return (
        <div
          role="alert"
          className="flex flex-col items-start gap-4 rounded-xl border border-destructive/40 p-6"
        >
          <p className="font-medium text-destructive">Не вдалося завантажити об&apos;єкти</p>
          <p className="text-muted-foreground">Перевірте з&apos;єднання і спробуйте ще раз.</p>
          <RetryButton />
        </div>
      );
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
};
