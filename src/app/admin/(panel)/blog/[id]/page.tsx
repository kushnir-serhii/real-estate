import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { PostEditHeader } from "@/features/admin/blog/post-edit-header";
import { PostCoverSection } from "@/features/admin/blog/post-cover-section";
import { PostForm } from "@/features/admin/blog/post-form";
import { postToFormRaw } from "@/features/admin/blog/post-form-values";
import { loadPickerSelection } from "@/features/admin/blog/post-picker-property";
import { PostRelatedSection } from "@/features/admin/blog/post-related-section";
import { requireAdmin } from "@/lib/auth/admin-session";
import { getActiveAgents } from "@/lib/db/admin-properties";
import { getAdminPost } from "@/lib/db/admin-posts";
import type { AdminPost } from "@/lib/db/admin-posts";
import { getSiteUrl } from "@/lib/site-url";

type AdminPostPageProps = { params: Promise<{ id: string }> };

/** `getAdminPost` uses the service role: check the admin first. One query per request. */
const loadPost = cache(async (id: string): Promise<AdminPost | null> => {
  const admin = await requireAdmin();
  if (!admin.ok) return null;
  return getAdminPost(id);
});

const TITLE_MAX = 40;
const shortTitle = (title: string) =>
  title.length > TITLE_MAX ? `${title.slice(0, TITLE_MAX).trimEnd()}…` : title || "Без заголовка";

export const generateMetadata = async ({ params }: AdminPostPageProps): Promise<Metadata> => {
  const { id } = await params;
  const post = await loadPost(id);
  return { title: post ? `Стаття — ${shortTitle(post.title)}` : "Статтю не знайдено" };
};

const AdminPostPage = async ({ params }: AdminPostPageProps) => {
  const { id } = await params;
  const post = await loadPost(id);
  if (!post) notFound();
  const [agents, related] = await Promise.all([getActiveAgents(), loadPickerSelection(post.property_ids)]);

  return (
    <div className="flex flex-col gap-6">
      <PostEditHeader post={post} />
      <PostForm
        key={post.id}
        postId={post.id}
        initialValues={postToFormRaw(post)}
        everPublished={post.published_at !== null}
        published={post.status === "published"}
        agents={agents.map((agent) => ({ ...agent, inactive: false }))}
        siteUrl={getSiteUrl()}
        mediaSections={
          <>
            <PostCoverSection postId={post.id} initialKey={post.cover_key} initialAlt={post.cover_alt} />
            <PostRelatedSection postId={post.id} initial={related} />
          </>
        }
      />
    </div>
  );
};

export default AdminPostPage;
