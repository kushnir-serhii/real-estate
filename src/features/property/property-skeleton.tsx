import { Skeleton } from "@/components/ui/skeleton";

const FACT_KEYS = ["a", "b", "c", "d", "e", "f"] as const;

/** Same boxes as `PropertyView`: gallery ratio, header, facts, aside. */
export const PropertySkeleton = () => (
  <div aria-busy="true" aria-label="Завантаження об'єкта" className="mx-auto w-full max-w-6xl px-4 pt-2 pb-16 sm:pt-4">
    <Skeleton className="my-3 h-5 w-28" />
    <div className="mt-2 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-10">
      <div className="flex min-w-0 flex-col gap-8">
        <Skeleton className="-mx-4 aspect-4/3 rounded-none sm:mx-0 sm:aspect-3/2 sm:rounded-xl" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="mt-2 h-9 w-48 lg:hidden" />
        </div>
        <div className="grid gap-x-8 sm:grid-cols-2">
          {FACT_KEYS.map((key) => (
            <div key={key} className="flex justify-between gap-4 border-b py-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-8 flex flex-col gap-4 lg:mt-0">
        <div className="hidden flex-col gap-3 rounded-xl bg-card p-5 ring-1 ring-foreground/10 lg:flex">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-3 h-12 w-full" />
        </div>
        <div className="flex flex-col gap-3 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
          <Skeleton className="h-6 w-2/3" />
          <div className="flex items-center gap-3">
            <Skeleton className="size-14 rounded-full" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-11 w-44" />
        </div>
      </div>
    </div>
  </div>
);
