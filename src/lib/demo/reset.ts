import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { PAGE_SLUGS } from "@/constants/pages";
import { CACHE_TAGS, pageTag, propertyTag } from "@/lib/db/cache-tags";
import { clearDemoUploads } from "./photos";
import { getDemoStore, resetDemoStore } from "./store";

/**
 * Throws the demo data away: the store is seeded again and the uploaded photos are dropped. Returns the slugs the
 * old and the new store had, so the caller can expire their cache tags. No Next calls here (unit-testable).
 */
export const resetDemoData = (): { slugs: string[] } => {
  const slugs = new Set(getDemoStore().properties.map((property) => property.slug));
  clearDemoUploads();
  for (const property of resetDemoStore().properties) slugs.add(property.slug);
  return { slugs: [...slugs] };
};

/** Expires every public cache the demo data feeds, so the site shows the seed right after a reset. Route handlers / actions only. */
export const revalidateAfterDemoReset = (slugs: readonly string[]): void => {
  for (const tag of Object.values(CACHE_TAGS)) revalidateTag(tag, { expire: 0 });
  for (const slug of slugs) revalidateTag(propertyTag(slug), { expire: 0 });
  for (const slug of PAGE_SLUGS) revalidateTag(pageTag(slug), { expire: 0 });
  revalidatePath("/", "layout");
};
