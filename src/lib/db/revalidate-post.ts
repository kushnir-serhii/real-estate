import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS, postTag } from "./cache-tags";

/**
 * After any admin write to a blog post: public caches (`posts`, `post:<slug>` for every slug involved, e.g. the old
 * and the new one), the public pages that list posts (blog, home, sitemap) and the admin pages. Call from server
 * actions / route handlers only (outside a Next request `revalidateTag` throws).
 */
export const revalidatePost = (id: string, slugs: readonly (string | null)[]): void => {
  revalidateTag(CACHE_TAGS.posts, { expire: 0 });
  for (const slug of new Set(slugs)) {
    if (slug === null) continue;
    revalidateTag(postTag(slug), { expire: 0 });
    revalidatePath(`/blog/${slug}`);
  }
  revalidatePath("/blog");
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/blog");
  revalidatePath(`/admin/blog/${id}`);
};
