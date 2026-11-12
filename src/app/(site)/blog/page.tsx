import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { BLOG_PAGE } from "@/constants/blog";
import { BlogCategoryChips } from "@/features/blog/blog-category-chips";
import { parseBlogState } from "@/features/blog/blog-params";
import type { BlogSearchParams } from "@/features/blog/blog-params";
import { BlogResults } from "@/features/blog/blog-results";
import { blogListCanonical, blogListTitle } from "@/features/blog/blog-seo";

type BlogPageProps = { searchParams: Promise<BlogSearchParams> };

export const generateMetadata = async ({ searchParams }: BlogPageProps): Promise<Metadata> => {
  const state = parseBlogState(await searchParams);
  return {
    title: blogListTitle(state),
    description: BLOG_PAGE.lead,
    alternates: { canonical: blogListCanonical(state) },
  };
};

const BlogPage = async ({ searchParams }: BlogPageProps) => {
  const state = parseBlogState(await searchParams);

  return (
    <div className="pb-16 sm:pb-24">
      <PageHeader eyebrow={BLOG_PAGE.eyebrow} title={BLOG_PAGE.title} lead={BLOG_PAGE.lead} />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4">
        <BlogCategoryChips state={state} />
        <BlogResults state={state} />
      </div>
    </div>
  );
};

export default BlogPage;
