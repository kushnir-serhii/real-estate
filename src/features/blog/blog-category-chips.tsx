import Link from "next/link";

import { BLOG_CATEGORIES, BLOG_PAGE } from "@/constants/blog";
import { cn } from "@/lib/utils";
import { blogHref } from "./blog-params";
import type { BlogState } from "./blog-params";

const CHIP_CLASS =
  "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium whitespace-nowrap outline-none transition-colors duration-(--duration-base) focus-visible:ring-3 focus-visible:ring-ring/50";

/** Category filter as plain links (works without JS); scrolls sideways on narrow screens. */
export const BlogCategoryChips = ({ state }: { state: BlogState }) => {
  const items = [
    { key: "all", label: BLOG_PAGE.allCategories, href: blogHref({ page: 1 }), active: state.category === undefined },
    ...BLOG_CATEGORIES.map((category) => ({
      key: category.key,
      label: category.label,
      href: blogHref({ category: category.key, page: 1 }),
      active: state.category === category.key,
    })),
  ];
  return (
    <nav aria-label={BLOG_PAGE.filterLabel}>
      <ul className="flex flex-wrap gap-2 py-1">
        {items.map((item) => (
          <li key={item.key} className="shrink-0">
            <Link
              href={item.href}
              aria-current={item.active ? "true" : undefined}
              className={cn(
                CHIP_CLASS,
                item.active
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-foreground ring-1 ring-foreground/15 hover:bg-secondary",
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};
