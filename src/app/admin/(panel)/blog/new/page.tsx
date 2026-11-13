import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { PostForm } from "@/features/admin/blog/post-form";
import { ADMIN_BLOG_PATH, EMPTY_POST_FORM } from "@/features/admin/blog/post-form-values";
import { requireAdmin } from "@/lib/auth/admin-session";
import { getActiveAgents } from "@/lib/db/admin-properties";
import { getSiteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Нова стаття" };

const AdminNewPostPage = async () => {
  // Agents are read with the service role: check the admin first (the layout renders in parallel).
  const admin = await requireAdmin();
  if (!admin.ok) notFound();
  const agents = await getActiveAgents();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Link href={ADMIN_BLOG_PATH} className={cn(buttonVariants({ variant: "ghost" }), "-ml-3 self-start")}>
          <ArrowLeft aria-hidden="true" />
          До списку статей
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold sm:text-4xl">Нова стаття</h1>
          <p className="max-w-prose text-muted-foreground">
            Чернетку на сайті не видно. Коли текст готовий, натисніть «Опублікувати».
          </p>
        </div>
      </div>
      <PostForm
        postId={null}
        initialValues={EMPTY_POST_FORM}
        everPublished={false}
        published={false}
        agents={agents.map((agent) => ({ ...agent, inactive: false }))}
        siteUrl={getSiteUrl()}
      />
    </div>
  );
};

export default AdminNewPostPage;
