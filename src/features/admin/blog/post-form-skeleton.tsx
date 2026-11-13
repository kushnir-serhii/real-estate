import { Skeleton } from "@/components/ui/skeleton";

const CARD_CLASS = "flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-6";

const FieldSkeleton = ({ tall = false }: { tall?: boolean }) => (
  <div className="flex flex-col gap-2">
    <Skeleton className="h-3.5 w-32" />
    <Skeleton className={tall ? "h-80 w-full rounded-xl" : "h-11 w-full rounded-control"} />
    <Skeleton className="h-4 w-48" />
  </div>
);

type PostFormSkeletonProps = { label: string };

/** Same boxes as the post editor: header, «Основне», the text, «SEO». */
export const PostFormSkeleton = ({ label }: PostFormSkeletonProps) => (
  <div aria-busy="true" aria-label={label} className="flex flex-col gap-6">
    <div className="flex flex-col gap-4">
      <Skeleton className="h-11 rounded-control w-48" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-full max-w-sm sm:h-10" />
        <Skeleton className="h-6 w-40" />
      </div>
    </div>
    <div className={CARD_CLASS}>
      <Skeleton className="h-6 w-28" />
      <FieldSkeleton />
      <FieldSkeleton />
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldSkeleton />
        <FieldSkeleton />
      </div>
    </div>
    <div className={CARD_CLASS}>
      <Skeleton className="h-6 w-36" />
      <FieldSkeleton tall />
    </div>
    <div className={CARD_CLASS}>
      <Skeleton className="h-6 w-16" />
      <FieldSkeleton />
      <Skeleton className="h-28 w-full" />
    </div>
  </div>
);
