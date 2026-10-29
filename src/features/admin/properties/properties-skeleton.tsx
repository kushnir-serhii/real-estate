import { Skeleton } from "@/components/ui/skeleton";

const ROW_KEYS = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const CARD_KEYS = ["a", "b", "c", "d"] as const;

/** Results placeholder: summary line, table rows from `lg`, cards below (same box sizes). */
export const PropertiesSkeleton = () => (
  <div aria-busy="true" aria-label="Завантаження об'єктів" className="flex flex-col gap-4">
    <div className="flex min-h-11 items-center">
      <Skeleton className="h-5 w-40" />
    </div>

    <div className="hidden overflow-hidden rounded-xl border bg-card lg:block">
      <div className="h-11 bg-muted/60" />
      {ROW_KEYS.map((key) => (
        <div key={key} className="flex items-start gap-8 border-t px-4 py-2">
          <Skeleton className="h-12 w-16 shrink-0 rounded-md" />
          <div className="flex flex-1 flex-col gap-1.5 pt-1">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <Skeleton className="mt-1 h-4 w-28" />
          <Skeleton className="mt-1 h-6 w-28" />
          <Skeleton className="mt-1 h-4 w-28" />
          <div className="flex w-24 flex-col gap-1.5 pt-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-10" />
          </div>
        </div>
      ))}
    </div>

    <ul className="grid gap-3 md:grid-cols-2 lg:hidden">
      {CARD_KEYS.map((key) => (
        <li key={key} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <div className="flex gap-3">
            <Skeleton className="h-15 w-20 shrink-0 rounded-md" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
          <Skeleton className="h-5 w-32" />
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-36" />
          </div>
        </li>
      ))}
    </ul>
  </div>
);
