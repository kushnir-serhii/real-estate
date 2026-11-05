import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { BLOG_PAGE, BLOG_POST_PAGE } from "@/constants/blog";

const LINK_CLASS =
  "inline-flex min-h-11 items-center rounded-md outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50";

/** Головна › Блог › title. The title is the current page and is truncated on one line. */
export const BlogBreadcrumbs = ({ title }: { title: string }) => (
  <nav aria-label={BLOG_POST_PAGE.breadcrumbsLabel}>
    <ol className="flex items-center gap-1 text-sm text-muted-foreground">
      <li className="shrink-0">
        <Link href="/" className={LINK_CLASS}>
          Головна
        </Link>
      </li>
      <li aria-hidden="true" className="shrink-0">
        <ChevronRight className="size-4" />
      </li>
      <li className="shrink-0">
        <Link href="/blog" className={LINK_CLASS}>
          {BLOG_PAGE.eyebrow}
        </Link>
      </li>
      <li aria-hidden="true" className="shrink-0">
        <ChevronRight className="size-4" />
      </li>
      <li className="min-w-0">
        <span aria-current="page" title={title} className="block truncate">
          {title}
        </span>
      </li>
    </ol>
  </nav>
);
