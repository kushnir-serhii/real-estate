import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ExternalLink } from "@/features/admin/leads/external-link";
import { PropertyUpdatedAt } from "@/features/admin/properties/property-updated-at";
import type { AdminPost } from "@/lib/db/post-query";
import { cn } from "@/lib/utils";
import { PostDeleteButton } from "./post-delete-button";
import { ADMIN_BLOG_PATH } from "./post-form-values";
import { PostStatusChips } from "./post-status-chips";

type PostEditHeaderProps = { post: AdminPost };

/** Back link, the title, status, the public link (published only), the last save and delete. */
export const PostEditHeader = ({ post }: PostEditHeaderProps) => (
  <div className="flex flex-col gap-4">
    <Link href={ADMIN_BLOG_PATH} className={cn(buttonVariants({ variant: "ghost" }), "-ml-3 self-start")}>
      <ArrowLeft aria-hidden="true" />
      До списку статей
    </Link>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-col gap-2">
        <h1 className="text-2xl font-bold text-balance wrap-anywhere sm:text-3xl">{post.title || "Без заголовка"}</h1>
        <PostStatusChips status={post.status} noindex={post.noindex} />
        <div className="flex flex-wrap items-center gap-x-4 text-sm text-muted-foreground">
          {post.status === "published" && <ExternalLink href={`/blog/${post.slug}`}>Відкрити на сайті</ExternalLink>}
          <PropertyUpdatedAt iso={post.updated_at} layout="inline" />
        </div>
      </div>
      <PostDeleteButton postId={post.id} title={post.title} published={post.status === "published"} />
    </div>
  </div>
);
