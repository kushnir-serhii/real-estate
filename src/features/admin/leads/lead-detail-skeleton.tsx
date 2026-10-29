import { Skeleton } from "@/components/ui/skeleton";

const CARD_CLASS = "flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-6";

const FactsCardSkeleton = ({ rows }: { rows: number }) => (
  <div className={CARD_CLASS}>
    <Skeleton className="h-6 w-28" />
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="flex flex-col gap-1.5 sm:flex-row sm:gap-4">
        <Skeleton className="h-4 w-24 sm:w-36" />
        <Skeleton className="h-4 w-full max-w-72" />
      </div>
    ))}
  </div>
);

/** Same boxes as the lead detail: header, three info cards left, delivery right from `lg`. */
export const LeadDetailSkeleton = () => (
  <div aria-busy="true" aria-label="Завантаження заявки" className="flex flex-col gap-6">
    <div className="flex flex-col gap-4">
      <Skeleton className="h-11 w-44" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-8 w-full max-w-md sm:h-9" />
        <div className="flex gap-4">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-6 w-36" />
        </div>
      </div>
    </div>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      <div className="flex min-w-0 flex-col gap-6">
        <div className={CARD_CLASS}>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-6 w-48" />
        </div>
        <FactsCardSkeleton rows={3} />
        <FactsCardSkeleton rows={2} />
      </div>
      <FactsCardSkeleton rows={6} />
    </div>
  </div>
);
