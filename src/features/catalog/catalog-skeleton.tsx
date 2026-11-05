import { Skeleton } from "@/components/ui/skeleton";
import { CatalogGrid } from "./catalog-grid";

const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f"] as const;

/** Results placeholder: count line + card grid (same box sizes as the cards). */
export const CatalogSkeleton = () => (
  <div aria-busy="true" aria-label="Завантаження об'єктів" className="flex flex-col gap-4">
    <Skeleton className="h-5 w-40" />
    <CatalogGrid>
      {SKELETON_KEYS.map((key) => (
        <li key={key} className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/5">
          <Skeleton className="aspect-4/3 w-full rounded-none" />
          <div className="flex flex-col gap-2 p-4 sm:p-5">
            <Skeleton className="h-7 w-1/2" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="mt-2 h-4 w-3/4" />
          </div>
        </li>
      ))}
    </CatalogGrid>
  </div>
);
