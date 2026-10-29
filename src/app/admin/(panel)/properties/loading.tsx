import { Skeleton } from "@/components/ui/skeleton";
import { PropertiesSkeleton } from "@/features/admin/properties/properties-skeleton";

const AdminPropertiesLoading = () => (
  <div aria-busy="true" className="flex flex-col gap-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <h1 className="text-2xl font-bold sm:text-3xl">Об&apos;єкти</h1>
      <Skeleton className="h-11 w-40" />
    </div>
    {/* Filters bar: same grid as the form. */}
    <div className="grid grid-cols-2 items-end gap-3 md:grid-cols-4 lg:flex">
      <div className="col-span-2 flex flex-col gap-2 lg:flex-1">
        <Skeleton className="h-3.5 w-56" />
        <Skeleton className="h-11 w-full" />
      </div>
      <div className="flex flex-col gap-2 lg:w-40">
        <Skeleton className="h-3.5 w-14" />
        <Skeleton className="h-11 w-full" />
      </div>
      <div className="flex flex-col gap-2 lg:w-36">
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="h-11 w-full" />
      </div>
      <div className="flex flex-col gap-2 lg:w-44">
        <Skeleton className="h-3.5 w-12" />
        <Skeleton className="h-11 w-full" />
      </div>
      <div className="flex flex-col gap-2 lg:w-40">
        <Skeleton className="h-3.5 w-8" />
        <Skeleton className="h-11 w-full" />
      </div>
      <Skeleton className="col-span-2 h-11 md:col-span-4 lg:w-28" />
    </div>
    <PropertiesSkeleton />
  </div>
);

export default AdminPropertiesLoading;
