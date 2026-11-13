import { PropertyCardSkeleton } from "@/features/properties/property-card-skeleton";
import { FeaturedGrid } from "./featured-grid";

const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f"] as const;

type FeaturedSkeletonProps = { count?: number };

export const FeaturedSkeleton = ({ count = SKELETON_KEYS.length }: FeaturedSkeletonProps) => (
  <FeaturedGrid>
    {SKELETON_KEYS.slice(0, count).map((key) => (
      <li key={key}>
        <PropertyCardSkeleton />
      </li>
    ))}
  </FeaturedGrid>
);
