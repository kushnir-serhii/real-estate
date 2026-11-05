import { Skeleton } from "@/components/ui/skeleton";

const SiteLoading = () => (
  <div aria-busy="true" className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 px-4 pt-8 pb-12 sm:pt-12">
    <Skeleton className="h-4 w-20" />
    <Skeleton className="h-10 w-2/3 sm:h-12" />
    <Skeleton className="mt-4 h-5 w-full" />
    <Skeleton className="h-5 w-full" />
    <Skeleton className="h-5 w-3/4" />
  </div>
);

export default SiteLoading;
