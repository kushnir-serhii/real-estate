import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import type { PageSlug } from "@/constants/pages";
import { PAGE_PATHS } from "@/features/pages/page-paths";
import { CACHE_TAGS, pageTag } from "./cache-tags";

/**
 * After any admin write to a static page: its cached content (`pages`, `page:<slug>`), the public page,
 * the sitemap (a `noindex` page leaves it) and the admin pages. Call from server actions / route handlers only
 * (outside a Next request `revalidateTag` throws).
 */
export const revalidatePage = (slug: PageSlug): void => {
  revalidateTag(CACHE_TAGS.pages, { expire: 0 });
  revalidateTag(pageTag(slug), { expire: 0 });
  revalidatePath(PAGE_PATHS[slug]);
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${slug}`);
};
