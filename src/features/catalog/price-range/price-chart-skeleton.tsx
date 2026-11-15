import { Skeleton } from "@/components/ui/skeleton";

const HEIGHTS = ["h-1/4", "h-1/3", "h-1/2", "h-2/3", "h-3/4", "h-1/2", "h-1/3", "h-2/3"] as const;

/** Placeholder bars while the histogram loads; same box as the chart, so nothing jumps. */
export const PriceChartSkeleton = () => (
  <div aria-hidden="true" className="flex h-28 items-end gap-0.5 px-3">
    {Array.from({ length: 24 }, (_, i) => (
      <Skeleton key={i} className={`flex-1 rounded-none ${HEIGHTS[(i * 5) % HEIGHTS.length]}`} />
    ))}
  </div>
);
