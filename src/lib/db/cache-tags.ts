/** Cache tags for `unstable_cache`; sync/admin code calls `revalidateTag` with these. */
export const CACHE_TAGS = {
  properties: "properties",
  pages: "pages",
  agents: "agents",
  settings: "settings",
  posts: "posts",
} as const;

export const pageTag = (slug: string) => `page:${slug}` as const;

export const propertyTag =(slug: string) => `property:${slug}` as const;

export const postTag = (slug: string) => `post:${slug}` as const;
