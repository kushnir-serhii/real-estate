import { Skeleton } from "@/components/ui/skeleton";

const KEYS = ["home", "about", "contacts", "privacy"] as const;

/** Same boxes as `PagesList`. */
export const PagesListSkeleton = () => (
  <div className="flex flex-col gap-4">
    {KEYS.map((key) => (
      <div
        key={key}
        className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:gap-6 sm:p-6"
      >
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-full max-w-sm" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-6 w-full max-w-md" />
        </div>
        <Skeleton className="h-11 w-full sm:w-36" />
      </div>
    ))}
  </div>
);
