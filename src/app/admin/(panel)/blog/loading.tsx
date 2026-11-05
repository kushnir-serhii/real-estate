import { Skeleton } from "@/components/ui/skeleton";
import { PostsSkeleton } from "@/features/admin/blog/posts-skeleton";

const AdminBlogLoading = () => (
  <div className="flex flex-col gap-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <h1 className="text-2xl font-bold sm:text-3xl">Блог</h1>
      <Skeleton className="h-11 w-full sm:w-40" />
    </div>
    <Skeleton className="h-24 w-full lg:h-16" />
    <PostsSkeleton />
  </div>
);

export default AdminBlogLoading;
