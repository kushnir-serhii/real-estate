import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder with the same box sizes as `PropertyCard`: 4:3 photo, price, two-line title, two rows of facts. */
export const PropertyCardSkeleton = () => (
  <div aria-hidden="true">
    <Skeleton className="aspect-4/3 w-full rounded-lg" />
    <div className="flex flex-col gap-2 pt-4">
      <Skeleton className="h-8 w-1/2 rounded-control" />
      {/* title: two lines of text-lg; facts: two rows of text-base, like most cards */}
      <div className="flex flex-col gap-1">
        <Skeleton className="h-6 w-full rounded-control" />
        <Skeleton className="h-6 w-2/3 rounded-control" />
      </div>
      <div className="flex flex-col gap-2 pt-3">
        <Skeleton className="h-6 w-3/4 rounded-control" />
        <Skeleton className="h-6 w-1/3 rounded-control" />
      </div>
    </div>
  </div>
);
