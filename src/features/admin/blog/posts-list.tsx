import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { blogCategoryLabel } from "@/constants/blog";
import { PropertyUpdatedAt } from "@/features/admin/properties/property-updated-at";
import type { AdminPostListItem } from "@/lib/db/post-query";
import { postEditHref } from "./post-form-values";
import { PostStatusChips } from "./post-status-chips";

type PostsListProps = { posts: readonly AdminPostListItem[] };

/** Posts as rows (same layout from 375px up): the title link is stretched over the row. */
export const PostsList = ({ posts }: PostsListProps) => (
  <ul className="flex flex-col gap-3">
    {posts.map((post) => (
      <li
        key={post.id}
        className="relative flex min-w-0 flex-col gap-2 rounded-xl bg-card p-4 text-card-foreground ring-1 ring-foreground/10 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:gap-6"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h3 className="text-base font-bold">
            <Link
              href={postEditHref(post.id)}
              prefetch={false}
              title={post.title}
              className="line-clamp-2 rounded-sm wrap-anywhere outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
            >
              {post.title}
            </Link>
          </h3>
          <p className="truncate font-mono text-sm text-muted-foreground" title={`/blog/${post.slug}`}>
            /blog/{post.slug}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground sm:w-80 sm:shrink-0 sm:justify-end">
          <PostStatusChips status={post.status} />
          <span className="font-medium text-foreground">{blogCategoryLabel(post.category)}</span>
          <PropertyUpdatedAt iso={post.updated_at} layout="inline" />
        </div>
        <ChevronRight className="hidden size-5 shrink-0 text-muted-foreground sm:block" aria-hidden="true" />
      </li>
    ))}
  </ul>
);
