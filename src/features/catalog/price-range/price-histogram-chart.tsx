import type { PriceHistogramBin } from "@/lib/db/property-histogram-values";
import { cn } from "@/lib/utils";
import type { Positions } from "./price-range-math";

type PriceHistogramChartProps = { bins: readonly PriceHistogramBin[]; range: Positions };

/** Bars only (decorative: the slider and the summary carry the meaning). Bars inside the range are `brand`. */
export const PriceHistogramChart = ({ bins, range }: PriceHistogramChartProps) => {
  const peak = Math.max(1, ...bins.map((b) => b.count));
  return (
    <div aria-hidden="true" className="flex h-28 items-end gap-0.5">
      {bins.map((bin, i) => (
        <div
          key={bin.from_usd}
          className={cn(
            "min-h-px flex-1 transition-[height,background-color] duration-(--duration-base) ease-(--ease-out-soft) motion-reduce:transition-none",
            i >= range.lo && i < range.hi ? "bg-brand" : "bg-muted-foreground/25",
          )}
          // Data-driven height: the only inline style (a percentage of the chart).
          style={{ height: `${(bin.count / peak) * 100}%` }}
        />
      ))}
    </div>
  );
};
