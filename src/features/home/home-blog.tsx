import { SectionHeading } from "@/components/section-heading";
import { HOME_BLOG } from "@/constants/home";
import { BlogCard } from "@/features/blog/blog-card";
import { getLatestPosts } from "@/lib/db/posts";
import type { PostListItem } from "@/lib/db/posts";
import { HomeSection } from "./home-section";

const CARD_SIZES = "(min-width: 1024px) 24rem, (min-width: 640px) 50vw, 100vw";

/** The 3 latest published posts. Renders nothing when there are none or the load fails (the page must not break). */
export const HomeBlog = async () => {
  let posts: PostListItem[];
  try {
    posts = await getLatestPosts(HOME_BLOG.count);
  } catch (error) {
    console.error("Home blog failed to load", error);
    return null;
  }
  if (posts.length === 0) return null;

  return (
    <HomeSection labelledBy="home-blog-title">
      <div className="flex flex-col gap-8">
        <div className="reveal">
          <SectionHeading
            id="home-blog-title"
            eyebrow={HOME_BLOG.eyebrow}
            title={HOME_BLOG.title}
            action={{ href: "/blog", label: HOME_BLOG.action }}
          />
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {posts.map((post) => (
            <li key={post.id} className="min-w-0">
              <BlogCard post={post} imageSizes={CARD_SIZES} />
            </li>
          ))}
        </ul>
      </div>
    </HomeSection>
  );
};
