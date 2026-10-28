import { Skeleton } from "@/components/ui/skeleton";
import { FeaturedGrid } from "./featured-grid";

const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f"] as const;

export const FeaturedSkeleton = () => (
  <FeaturedGrid>
    {SKELETON_KEYS.map((key) => (
      <li key={key} className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <Skeleton className="aspect-4/3 w-full rounded-none" />
        <div className="flex flex-col gap-3 p-4">
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </li>
    ))}
  </FeaturedGrid>
);
