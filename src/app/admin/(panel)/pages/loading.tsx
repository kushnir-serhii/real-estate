import { Skeleton } from "@/components/ui/skeleton";
import { PagesListSkeleton } from "@/features/admin/pages/pages-list-skeleton";

const AdminPagesLoading = () => (
  <div aria-busy="true" aria-label="Завантаження сторінок" className="flex flex-col gap-6">
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold sm:text-3xl">Сторінки</h1>
      <Skeleton className="h-5 w-full max-w-prose" />
    </div>
    <PagesListSkeleton />
  </div>
);

export default AdminPagesLoading;
