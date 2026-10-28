import { Skeleton } from "@/components/ui/skeleton";

const SiteLoading = () => (
  <div aria-busy="true" className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8 sm:py-12">
    <Skeleton className="h-10 w-2/3" />
    <Skeleton className="h-5 w-full" />
    <Skeleton className="h-5 w-full" />
    <Skeleton className="h-5 w-3/4" />
  </div>
);

export default SiteLoading;
