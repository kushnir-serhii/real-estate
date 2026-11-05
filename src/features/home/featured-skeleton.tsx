import { Skeleton } from "@/components/ui/skeleton";
import { FeaturedGrid } from "./featured-grid";

const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f"] as const;

type FeaturedSkeletonProps = { count?: number };

export const FeaturedSkeleton = ({ count = SKELETON_KEYS.length }: FeaturedSkeletonProps) => (
  <FeaturedGrid>
    {SKELETON_KEYS.slice(0, count).map((key) => (
      <li key={key} className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/5">
        <Skeleton className="aspect-4/3 w-full rounded-none" />
        <div className="flex flex-col gap-2 p-4 sm:p-5">
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="mt-2 h-4 w-3/4" />
        </div>
      </li>
    ))}
  </FeaturedGrid>
);
