import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { NEW_POST_PATH } from "@/features/admin/blog/post-form-values";
import { PostsFilters } from "@/features/admin/blog/posts-filters";
import {
  hasDefaultPostParams,
  parsePostsFilters,
  postsHref,
  postsSearchParams,
} from "@/features/admin/blog/posts-params";
import type { PostsSearchParams } from "@/features/admin/blog/posts-params";
import { PostsResults } from "@/features/admin/blog/posts-results";
import { PostsSkeleton } from "@/features/admin/blog/posts-skeleton";

export const metadata: Metadata = { title: "Блог" };

type AdminBlogPageProps = { searchParams: Promise<PostsSearchParams> };

// The panel layout checks the admin session before this renders (same as the properties page).
const AdminBlogPage = async ({ searchParams }: AdminBlogPageProps) => {
  const params = await searchParams;
  const filters = parsePostsFilters(params);
  // Clean shareable URL after a form submit; `redirect` replaces the history entry.
  if (hasDefaultPostParams(params)) redirect(postsHref(filters));
  // Remount the uncontrolled form and the results when the URL changes.
  const query = postsSearchParams(filters).toString();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-3xl font-bold sm:text-4xl">Блог</h1>
        <Link href={NEW_POST_PATH} className={buttonVariants()}>
          <Plus aria-hidden="true" />
          Нова стаття
        </Link>
      </div>
      <PostsFilters key={`filters-${query}`} filters={filters} />
      <Suspense key={`results-${query}`} fallback={<PostsSkeleton />}>
        <PostsResults filters={filters} />
      </Suspense>
    </div>
  );
};

export default AdminBlogPage;
