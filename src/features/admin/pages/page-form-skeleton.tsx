import { Skeleton } from "@/components/ui/skeleton";

const CARD_CLASS = "flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-6";

const FieldSkeleton = ({ tall = false }: { tall?: boolean }) => (
  <div className="flex flex-col gap-2">
    <Skeleton className="h-3.5 w-32" />
    <Skeleton className={tall ? "h-64 w-full" : "h-11 w-full"} />
    <Skeleton className="h-4 w-48" />
  </div>
);

/** Same boxes as the page editor: header, «Контент», «SEO» with the preview, «Індексація». */
export const PageFormSkeleton = () => (
  <div aria-busy="true" aria-label="Завантаження сторінки" className="flex flex-col gap-6">
    <div className="flex flex-col gap-4">
      <Skeleton className="h-11 w-48" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-full max-w-sm sm:h-9" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-6 w-64 max-w-full" />
      </div>
    </div>
    <div className={CARD_CLASS}>
      <Skeleton className="h-6 w-28" />
      <Skeleton className="h-4 w-full max-w-prose" />
      <FieldSkeleton />
      <FieldSkeleton tall />
    </div>
    <div className={CARD_CLASS}>
      <Skeleton className="h-6 w-16" />
      <FieldSkeleton />
      <FieldSkeleton />
      <Skeleton className="h-28 w-full" />
    </div>
    <div className={CARD_CLASS}>
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-11 w-72 max-w-full" />
      <Skeleton className="h-4 w-full max-w-prose" />
    </div>
  </div>
);
