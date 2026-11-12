import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { BLOG_NOT_FOUND } from "@/constants/blog";

// Next adds `noindex` to 404 responses itself.
export const metadata: Metadata = { title: BLOG_NOT_FOUND.title };

const BlogPostNotFound = () => (
  <div className="pb-16 sm:pb-24">
    <PageHeader width="narrow" eyebrow={BLOG_NOT_FOUND.eyebrow} title={BLOG_NOT_FOUND.title} lead={BLOG_NOT_FOUND.lead}>
      <Link href="/blog" className={buttonVariants({ variant: "dawn", size: "lg" })}>
        {BLOG_NOT_FOUND.action}
        <ArrowRight data-icon="inline-end" aria-hidden="true" />
      </Link>
    </PageHeader>
  </div>
);

export default BlogPostNotFound;
