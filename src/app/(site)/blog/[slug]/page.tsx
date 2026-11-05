import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BlogPostView } from "@/features/blog/blog-post-view";
import { getPostBySlug } from "@/lib/db/posts";

type BlogPostPageProps = { params: Promise<{ slug: string }> };

// No paths at build time (as the property page): each post renders on its first visit and stays cached (ISR),
// invalidated by the `posts` / `post:<slug>` tags after admin edits.
export const generateStaticParams = async (): Promise<{ slug: string }[]> => [];

export const revalidate = 3600;

export const generateMetadata = async ({ params }: BlogPostPageProps): Promise<Metadata> => {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();
  return {
    title: post.seo_title ?? post.title,
    description: post.seo_description ?? post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
  };
};

const BlogPostPage = async ({ params }: BlogPostPageProps) => {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();
  return <BlogPostView post={post} />;
};

export default BlogPostPage;
