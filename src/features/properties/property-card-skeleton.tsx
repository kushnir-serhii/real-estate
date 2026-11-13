import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder with the same box sizes as `PropertyCard`: 4:3 photo, price, two-line title, two rows of facts. */
export const PropertyCardSkeleton = () => (
  <div aria-hidden="true" className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/5">
    <Skeleton className="aspect-4/3 w-full rounded-none" />
    <div className="flex flex-col gap-2 p-5 sm:p-6">
      <Skeleton className="h-8 w-1/2" />
      {/* title: two lines of text-lg; facts: two rows of text-base, like most cards */}
      <div className="flex flex-col gap-1">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-2/3" />
      </div>
      <div className="flex flex-col gap-2 pt-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-6 w-1/3" />
      </div>
    </div>
  </div>
);
