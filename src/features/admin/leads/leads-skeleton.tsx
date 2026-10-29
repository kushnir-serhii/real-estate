import { Skeleton } from "@/components/ui/skeleton";

const ROW_KEYS = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const CARD_KEYS = ["a", "b", "c", "d"] as const;

/** Results placeholder: summary line, table rows from `lg`, cards below (same box sizes). */
export const LeadsSkeleton = () => (
  <div aria-busy="true" aria-label="Завантаження заявок" className="flex flex-col gap-4">
    <div className="flex min-h-11 items-center">
      <Skeleton className="h-5 w-40" />
    </div>

    <div className="hidden overflow-hidden rounded-xl border bg-card lg:block">
      <div className="h-11 bg-muted/60" />
      {ROW_KEYS.map((key) => (
        <div key={key} className="flex items-start gap-8 border-t px-4 py-3">
          <div className="flex w-24 flex-col gap-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-10" />
          </div>
          <Skeleton className="h-4 w-28" />
          <div className="flex w-48 flex-col gap-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-24" />
        </div>
      ))}
    </div>

    <ul className="grid gap-3 md:grid-cols-2 lg:hidden">
      {CARD_KEYS.map((key) => (
        <li key={key} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <div className="flex justify-between gap-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-6 w-36" />
          </div>
        </li>
      ))}
    </ul>
  </div>
);
