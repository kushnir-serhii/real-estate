import { Skeleton } from "@/components/ui/skeleton";
import { CatalogSkeleton } from "@/features/catalog/catalog-skeleton";

const FIELD_KEYS = ["a", "b", "c", "d", "e", "f"] as const;

const CatalogLoading = () => (
  <div aria-busy="true" className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
    <Skeleton className="h-8 w-2/3 max-w-sm sm:h-9" />
    <div className="mt-6 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-8">
      <div className="hidden flex-col gap-5 rounded-xl bg-card p-4 ring-1 ring-foreground/10 lg:flex">
        {FIELD_KEYS.map((key) => (
          <div key={key} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-11 w-32 lg:invisible" />
          <Skeleton className="h-11 w-44" />
        </div>
        <CatalogSkeleton />
      </div>
    </div>
  </div>
);

export default CatalogLoading;
