import "server-only";

import { TriangleAlert } from "lucide-react";

import { BLOG_PAGE } from "@/constants/blog";
import { RetryButton } from "@/features/home/retry-button";
import { hasPublicData } from "@/lib/data-driver";
import { getPublishedPosts } from "@/lib/db/posts";
import type { PostPage } from "@/lib/db/posts";
import { BlogCard } from "./blog-card";
import { BlogEmpty } from "./blog-empty";
import { BlogGrid } from "./blog-grid";
import { blogHref } from "./blog-params";
import type { BlogState } from "./blog-params";
import { BlogPagination } from "./blog-pagination";

type ResultsState =
  | { kind: "ready"; page: PostPage }
  | { kind: "empty" }
  | { kind: "out-of-range" }
  | { kind: "error" };

const CARD_SIZES = "(min-width: 1152px) 22rem, (min-width: 640px) 50vw, 100vw";

const load = async (state: BlogState): Promise<ResultsState> => {
  if (!hasPublicData()) return { kind: "empty" };
  try {
    const page = await getPublishedPosts({ category: state.category, page: state.page });
    if (page.posts.length > 0) return { kind: "ready", page };
    return page.total > 0 ? { kind: "out-of-range" } : { kind: "empty" };
  } catch (error) {
    console.error("blog: failed to load posts", error instanceof Error ? error.message : error);
    return { kind: "error" };
  }
};

export const BlogResults = async ({ state }: { state: BlogState }) => {
  const result = await load(state);

  switch (result.kind) {
    case "ready":
      return (
        <div className="flex flex-col gap-4">
          <h2 className="sr-only">{BLOG_PAGE.listLabel}</h2>
          <BlogGrid>
            {result.page.posts.map((post, i) => (
              <li key={post.id}>
                <BlogCard post={post} imageSizes={CARD_SIZES} priority={i < 3} />
              </li>
            ))}
          </BlogGrid>
          <div className="pt-4">
            <BlogPagination state={state} pageCount={result.page.pageCount} />
          </div>
        </div>
      );
    case "empty":
      return <BlogEmpty kind={state.category ? "category" : "nothing"} />;
    case "out-of-range":
      return <BlogEmpty kind="out-of-range" firstPageHref={blogHref(state, { page: 1 })} />;
    case "error":
      return (
        <div
          role="alert"
          className="flex flex-col items-start gap-4 rounded-2xl border border-destructive/40 bg-card p-6 sm:p-8"
        >
          <p className="flex items-center gap-2 text-lg font-semibold text-destructive">
            <TriangleAlert className="size-5 shrink-0" aria-hidden="true" />
            {BLOG_PAGE.loadError}
          </p>
          <p className="text-muted-foreground">{BLOG_PAGE.loadErrorBody}</p>
          <RetryButton />
        </div>
      );
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
};
