import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS, propertyTag } from "./cache-tags";

/**
 * After any admin write to a property: public caches (`properties`, `property:<slug>` for every slug involved,
 * e.g. the old and the new one) and the admin pages. Call from server actions / route handlers only
 * (outside a Next request `revalidateTag` throws).
 */
export const revalidateProperty = (id: string, slugs: readonly (string | null)[]): void => {
  revalidateTag(CACHE_TAGS.properties, { expire: 0 });
  for (const slug of new Set(slugs)) {
    if (slug !== null) revalidateTag(propertyTag(slug), { expire: 0 });
  }
  revalidatePath("/admin/properties");
  revalidatePath(`/admin/properties/${id}`);
};
