import Link from "next/link";

import { blogCategoryLabel, BLOG_POST_PAGE } from "@/constants/blog";
import { Markdown } from "@/features/pages/markdown";
import type { PostDetail } from "@/lib/db/posts";
import { BlogAuthorCard } from "./blog-author-card";
import { BlogBreadcrumbs } from "./blog-breadcrumbs";
import { BlogCover } from "./blog-cover";
import { BlogCta } from "./blog-cta";
import { formatPostDate, readingTimeLabel } from "./blog-format";
import { BlogRelated } from "./blog-related";

const COVER_SIZES = "(min-width: 768px) 48rem, 100vw";

/** The article page: header, cover, Markdown body, tags, author, CTA, related properties. */
export const BlogPostView = ({ post }: { post: PostDetail }) => {
  const date = formatPostDate(post.published_at);
  return (
    <div className="pb-16 sm:pb-24">
      <div className="mx-auto w-full max-w-3xl px-4 pt-2 sm:pt-4">
        <BlogBreadcrumbs title={post.title} />

        <header className="mt-4 flex flex-col items-start gap-4 sm:mt-6">
          <Link
            href={`/blog?category=${post.category}`}
            className="inline-flex min-h-11 items-center rounded-full bg-secondary px-4 text-sm font-semibold text-secondary-foreground outline-none hover:bg-secondary/70 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {blogCategoryLabel(post.category)}
          </Link>
          <h1 className="text-h1 break-words">{post.title}</h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {date && <time dateTime={post.published_at ?? undefined}>{date}</time>}
            {date && <span aria-hidden="true">·</span>}
            <span>{readingTimeLabel(post.body)}</span>
          </p>
        </header>

        <BlogCover
          coverKey={post.cover_key}
          alt={post.cover_alt}
          sizes={COVER_SIZES}
          priority
          className="mt-6 rounded-2xl sm:mt-8"
        />

        <article className="mt-8 sm:mt-10">
          <Markdown className="max-w-[68ch] text-base leading-7 text-foreground sm:text-lg">{post.body}</Markdown>
        </article>

        {post.tags.length > 0 && (
          <ul aria-label={BLOG_POST_PAGE.tagsLabel} className="mt-8 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <li key={tag} className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
                {tag}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-10 flex flex-col gap-6">
          <BlogAuthorCard author={post.author} />
          <BlogCta />
        </div>
      </div>

      {post.related.length > 0 && (
        <div className="mx-auto mt-14 w-full max-w-6xl px-4 sm:mt-20">
          <BlogRelated items={post.related} />
        </div>
      )}
    </div>
  );
};
