import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BRAND, OG_DEFAULT_IMAGE } from "@/constants/brand";
import { blogPostSeoDescription, blogPostSeoTitle } from "@/features/blog/blog-seo";
import { BlogPostView } from "@/features/blog/blog-post-view";
import { getPostBySlug } from "@/lib/db/posts";
import { photoUrl } from "@/lib/photos/photo-url";

type BlogPostPageProps = { params: Promise<{ slug: string }> };

// No paths at build time (as the property page): each post renders on its first visit and stays cached (ISR),
// invalidated by the `posts` / `post:<slug>` tags after admin edits.
export const generateStaticParams = async (): Promise<{ slug: string }[]> => [];

export const revalidate = 3600;

export const generateMetadata = async ({ params }: BlogPostPageProps): Promise<Metadata> => {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();
  const canonical = `/blog/${post.slug}`;
  const title = blogPostSeoTitle(post);
  const description = blogPostSeoDescription(post);
  // Relative URLs are resolved against `metadataBase` (the site origin), so the image is absolute in the output.
  const images = post.cover_key
    ? [{ url: photoUrl(post.cover_key), ...(post.cover_alt ? { alt: post.cover_alt } : {}) }]
    : [OG_DEFAULT_IMAGE];
  return {
    title,
    description,
    alternates: { canonical },
    robots: post.noindex ? { index: false, follow: true } : undefined,
    // A page-level openGraph replaces the root one entirely, so locale and site name are repeated here.
    openGraph: {
      type: "article",
      url: canonical,
      locale: "uk_UA",
      siteName: BRAND.name,
      title: typeof title === "string" ? title : title.absolute,
      description,
      images,
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
    },
    twitter: { card: "summary_large_image" },
  };
};

const BlogPostPage = async ({ params }: BlogPostPageProps) => {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();
  return <BlogPostView post={post} />;
};

export default BlogPostPage;
