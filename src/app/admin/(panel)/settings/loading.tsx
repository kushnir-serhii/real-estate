import { Skeleton } from "@/components/ui/skeleton";

const COUNT_KEYS = ["sync", "plektan", "admin"] as const;
const FIELD_KEYS = ["uah", "eur"] as const;

const SectionSkeleton = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-6">{children}</div>
);

const AdminSettingsLoading = () => (
  <div aria-busy="true" aria-label="Завантаження налаштувань" className="flex flex-col gap-6">
    <h1 className="text-2xl font-bold sm:text-3xl">Налаштування</h1>

    <SectionSkeleton>
      <Skeleton className="h-6 w-48" />
      <div className="flex items-start gap-3">
        <Skeleton className="size-10 shrink-0 rounded-lg" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full max-w-prose" />
          <Skeleton className="h-4 w-2/3 max-w-96" />
        </div>
      </div>
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
        {COUNT_KEYS.map((key) => (
          <div key={key} className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
      <Skeleton className="h-11 w-full sm:w-64" />
    </SectionSkeleton>

    <SectionSkeleton>
      <Skeleton className="h-6 w-36" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-full max-w-prose" />
        <Skeleton className="h-4 w-3/4 max-w-96" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
        {FIELD_KEYS.map((key) => (
          <div key={key} className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-11 w-full sm:w-44" />
    </SectionSkeleton>
  </div>
);

export default AdminSettingsLoading;
