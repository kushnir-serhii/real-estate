import { Skeleton } from "@/components/ui/skeleton";
import { LeadsSkeleton } from "@/features/admin/leads/leads-skeleton";

const AdminLeadsLoading = () => (
  <div aria-busy="true" className="flex flex-col gap-6">
    <h1 className="text-2xl font-bold sm:text-3xl">Заявки</h1>
    {/* Filters bar: same grid as the form. */}
    <div className="grid grid-cols-2 items-end gap-3 md:grid-cols-4 lg:flex">
      <div className="col-span-2 flex flex-col gap-2 lg:flex-1">
        <Skeleton className="h-3.5 w-56" />
        <Skeleton className="h-11 w-full" />
      </div>
      <div className="col-span-2 flex flex-col gap-2 lg:w-48">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-11 w-full" />
      </div>
      <div className="flex flex-col gap-2 lg:w-40">
        <Skeleton className="h-3.5 w-8" />
        <Skeleton className="h-11 w-full" />
      </div>
      <div className="flex flex-col gap-2 lg:w-40">
        <Skeleton className="h-3.5 w-8" />
        <Skeleton className="h-11 w-full" />
      </div>
      <Skeleton className="h-11 lg:w-40" />
      <Skeleton className="h-11 lg:w-28" />
    </div>
    <LeadsSkeleton />
  </div>
);

export default AdminLeadsLoading;
