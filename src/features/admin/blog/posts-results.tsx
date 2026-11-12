import "server-only";

import { X } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/admin-session";
import { listAdminPosts } from "@/lib/db/admin-posts";
import type { AdminPostPage } from "@/lib/db/admin-posts";
import { ADMIN_BLOG_PATH } from "./post-form-values";
import { PostsEmpty } from "./posts-empty";
import { PostsList } from "./posts-list";
import { PostsPagination } from "./posts-pagination";
import { hasActivePostFilters, postsHref, toAdminPostFilters } from "./posts-params";
import type { PostsViewFilters } from "./posts-params";

type PostsResultsProps = { filters: PostsViewFilters };

const rules = new Intl.PluralRules("uk-UA");
const FORMS: Record<Intl.LDMLPluralRule, string> = {
  zero: "статей",
  one: "стаття",
  two: "статті",
  few: "статті",
  many: "статей",
  other: "статті",
};
const postsCountLabel = (n: number): string => `${new Intl.NumberFormat("uk-UA").format(n)} ${FORMS[rules.select(n)]}`;

type SummaryProps = { total: number; filtered: boolean };

const Summary = ({ total, filtered }: SummaryProps) => (
  <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-2">
    <p role="status" className="text-sm text-muted-foreground">
      {filtered ? "Знайдено" : "Усього"}{" "}
      <span className="font-medium text-foreground tabular-nums">{postsCountLabel(total)}</span>
    </p>
    {filtered && (
      <Link href={ADMIN_BLOG_PATH} className={buttonVariants({ variant: "ghost" })}>
        <X aria-hidden="true" />
        Скинути фільтри
      </Link>
    )}
  </div>
);

type ResultsState =
  | { kind: "ready"; page: AdminPostPage }
  | { kind: "none" }
  | { kind: "filtered" }
  | { kind: "out-of-range"; total: number };

const toState = (page: AdminPostPage, filtered: boolean): ResultsState => {
  if (page.items.length > 0) return { kind: "ready", page };
  if (page.total > 0) return { kind: "out-of-range", total: page.total };
  return filtered ? { kind: "filtered" } : { kind: "none" };
};

/** Loads one page of posts; a failed query throws to the route's `error.tsx`. */
export const PostsResults = async ({ filters }: PostsResultsProps) => {
  // `listAdminPosts` uses the service role: check the admin first (the layout does too).
  const admin = await requireAdmin();
  if (!admin.ok) notFound();
  const filtered = hasActivePostFilters(filters);
  const page = await listAdminPosts(toAdminPostFilters(filters));
  const state = toState(page, filtered);

  switch (state.kind) {
    case "ready":
      return (
        <div className="flex flex-col gap-4">
          <Summary total={state.page.total} filtered={filtered} />
          <h2 className="sr-only">Список статей</h2>
          <PostsList posts={state.page.items} />
          <div className="pt-2">
            <PostsPagination filters={filters} pageCount={state.page.pageCount} />
          </div>
        </div>
      );
    case "none":
      return <PostsEmpty kind="none" />;
    case "filtered":
      return (
        <div className="flex flex-col gap-4">
          <Summary total={0} filtered />
          <PostsEmpty kind="filtered" />
        </div>
      );
    case "out-of-range":
      return (
        <div className="flex flex-col gap-4">
          <Summary total={state.total} filtered={filtered} />
          <PostsEmpty kind="out-of-range" firstPageHref={postsHref(filters, { page: 1 })} />
        </div>
      );
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
};
