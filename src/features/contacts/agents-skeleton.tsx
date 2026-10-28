import { Skeleton } from "@/components/ui/skeleton";

const KEYS = ["a", "b"] as const;

export const AgentsSkeleton = () => (
  <section aria-hidden="true" className="flex flex-col gap-6">
    <Skeleton className="h-8 w-48" />
    <ul className="grid gap-4 sm:grid-cols-2">
      {KEYS.map((key) => (
        <li key={key} className="flex gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <Skeleton className="size-16 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </li>
      ))}
    </ul>
  </section>
);
