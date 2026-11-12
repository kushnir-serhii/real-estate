import { Newspaper } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { BLOG_PAGE } from "@/constants/blog";

type BlogEmptyProps = { kind: "nothing" } | { kind: "category" } | { kind: "out-of-range"; firstPageHref: string };

export const BlogEmpty = (props: BlogEmptyProps) => {
  const text =
    props.kind === "nothing"
      ? { title: BLOG_PAGE.emptyAllTitle, body: BLOG_PAGE.emptyAllBody }
      : props.kind === "category"
        ? { title: BLOG_PAGE.emptyCategoryTitle, body: BLOG_PAGE.emptyCategoryBody }
        : { title: BLOG_PAGE.outOfRangeTitle, body: BLOG_PAGE.outOfRangeBody };
  return (
    <div className="flex flex-col items-start gap-5 rounded-2xl border border-dashed border-control bg-card p-6 sm:p-10">
      <span
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-full bg-dawn text-dawn-foreground"
      >
        <Newspaper className="size-6" />
      </span>
      <div className="flex flex-col gap-2">
        <h2 className="text-h3">{text.title}</h2>
        <p className="max-w-prose text-muted-foreground">{text.body}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {props.kind === "nothing" && (
          <Link href="/catalog" className={buttonVariants({ variant: "dawn" })}>
            {BLOG_PAGE.toCatalog}
          </Link>
        )}
        {props.kind === "category" && (
          <Link href="/blog" className={buttonVariants({ variant: "dawn" })}>
            {BLOG_PAGE.allArticles}
          </Link>
        )}
        {props.kind === "out-of-range" && (
          <Link href={props.firstPageHref} className={buttonVariants({ variant: "dawn" })}>
            {BLOG_PAGE.toFirstPage}
          </Link>
        )}
      </div>
    </div>
  );
};
