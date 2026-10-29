import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const CARD_CLASS = "flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-6";

const FieldSkeleton = () => (
  <div className="flex flex-col gap-2">
    <Skeleton className="h-3.5 w-28" />
    <Skeleton className="h-11 w-full" />
  </div>
);

const SectionSkeleton = ({ fields }: { fields: number }) => (
  <div className={CARD_CLASS}>
    <Skeleton className="h-6 w-32" />
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: fields }, (_, i) => (
        <FieldSkeleton key={i} />
      ))}
    </div>
  </div>
);

type PropertyFormSkeletonProps = { label: string; withPublish: boolean };

/** Same boxes as the edit page: header, form sections, the publish card on the right from `lg`. */
export const PropertyFormSkeleton = ({ label, withPublish }: PropertyFormSkeletonProps) => (
  <div aria-busy="true" aria-label={label} className="flex flex-col gap-6">
    <div className="flex flex-col gap-4">
      <Skeleton className="h-11 w-48" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-full max-w-md sm:h-9" />
        <Skeleton className="h-6 w-64" />
      </div>
    </div>
    <div className={cn("grid items-start gap-6", withPublish && "lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]")}>
      {withPublish && (
        <div className={cn(CARD_CLASS, "lg:order-last")}>
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-11 w-full" />
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-6">
        <SectionSkeleton fields={4} />
        <SectionSkeleton fields={2} />
        <SectionSkeleton fields={6} />
      </div>
    </div>
  </div>
);
