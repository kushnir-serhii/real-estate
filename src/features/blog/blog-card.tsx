import Link from "next/link";

import { blogCategoryLabel } from "@/constants/blog";
import type { PostListItem } from "@/lib/db/posts";
import { BlogCover } from "./blog-cover";
import { formatPostDate } from "./blog-format";

type BlogCardProps = { post: PostListItem; imageSizes: string; priority?: boolean };

/** Same pattern as the property card: an `article` with the title link stretched over it. */
export const BlogCard = ({ post, imageSizes, priority = false }: BlogCardProps) => {
  const date = formatPostDate(post.published_at);
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-card text-card-foreground ring-1 ring-foreground/5 transition-[transform,box-shadow] duration-(--duration-base) ease-(--ease-out-soft) hover:-translate-y-1 hover:shadow-float has-focus-visible:ring-3 has-focus-visible:ring-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <BlogCover coverKey={post.cover_key} alt={null} sizes={imageSizes} priority={priority} />
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <p className="eyebrow text-dawn-text">{blogCategoryLabel(post.category)}</p>
        <h3
          className="line-clamp-3 font-heading text-lg leading-snug font-semibold tracking-tight break-words transition-colors duration-(--duration-fast) group-hover:text-dawn-text"
          title={post.title}
        >
          <Link href={`/blog/${post.slug}`} className="outline-none after:absolute after:inset-0 after:content-['']">
            {post.title}
          </Link>
        </h3>
        <p className="line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>
        {date && (
          <time dateTime={post.published_at ?? undefined} className="mt-auto pt-2 text-sm text-muted-foreground">
            {date}
          </time>
        )}
      </div>
    </article>
  );
};
