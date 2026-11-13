import { Skeleton } from "@/components/ui/skeleton";
import { PropertyCardSkeleton } from "@/features/properties/property-card-skeleton";
import { CatalogGrid } from "./catalog-grid";

const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f"] as const;

type CatalogSkeletonProps = {
  /** Same as `CatalogGrid`: `sidebar` for the catalog, `full` for favorites. */
  layout?: "sidebar" | "full";
};

/** Results placeholder: count line + card grid (same box sizes as the cards). */
export const CatalogSkeleton = ({ layout }: CatalogSkeletonProps) => (
  <div aria-busy="true" aria-label="Завантаження об'єктів" className="flex flex-col gap-4">
    <Skeleton className="h-5 w-40" />
    <CatalogGrid layout={layout}>
      {SKELETON_KEYS.map((key) => (
        <li key={key}>
          <PropertyCardSkeleton />
        </li>
      ))}
    </CatalogGrid>
  </div>
);
