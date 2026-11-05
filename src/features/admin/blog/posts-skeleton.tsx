import { Skeleton } from "@/components/ui/skeleton";

const ROW_KEYS = ["a", "b", "c", "d", "e", "f"] as const;

/** Results placeholder: summary line and rows (same box sizes as the list). */
export const PostsSkeleton = () => (
  <div aria-busy="true" aria-label="Завантаження статей" className="flex flex-col gap-4">
    <div className="flex min-h-11 items-center">
      <Skeleton className="h-5 w-40" />
    </div>
    <ul className="flex flex-col gap-3">
      {ROW_KEYS.map((key) => (
        <li
          key={key}
          className="flex flex-col gap-2 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:gap-6"
        >
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <Skeleton className="h-6 w-full sm:w-80" />
        </li>
      ))}
    </ul>
  </div>
);
