import "server-only";
import { BLOG_PAGE_SIZE, BLOG_RELATED_MAX } from "@/constants/blog";
import { createPublicClient } from "@/lib/supabase/public";
import type { PostsDriver } from "../driver-types";
import type { PostDetail, PostListItem, SitemapPost } from "../post-query";
import type { PropertyAgent, PublishedProperty } from "../property-query";
import { supabasePropertiesDriver } from "./properties";

/** The public client sees published posts only (RLS); `status` is filtered too so the intent is in the query. */
const LIST_COLUMNS = "id,slug,title,excerpt,category,tags,cover_key,cover_alt,published_at,updated_at";
const DETAIL_COLUMNS =
  "id,slug,title,excerpt,body,category,tags,cover_key,cover_alt,published_at,seo_title,seo_description,noindex,created_at,updated_at";
const AUTHOR = "author:agents!author_agent_id(id,name,phones,email,photo_url)";

type DetailRow = Omit<PostDetail, "author" | "related"> & { author: PropertyAgent | null };

const fetchPublishedPosts: PostsDriver["fetchPublishedPosts"] = async ({ category, page }) => {
  const from = (page - 1) * BLOG_PAGE_SIZE;
  let query = createPublicClient().from("posts").select(LIST_COLUMNS, { count: "exact" }).eq("status", "published");
  if (category) query = query.eq("category", category);
  const { data, error, count } = await query
    .order("published_at", { ascending: false })
    .order("id")
    .range(from, from + BLOG_PAGE_SIZE - 1)
    .overrideTypes<PostListItem[], { merge: false }>();

  // PGRST103: the page starts past the last row. Not an error for the visitor: empty page + real total.
  if (error?.code === "PGRST103" && page > 1) {
    const first = await fetchPublishedPosts({ category, page: 1 });
    return { ...first, posts: [], page };
  }
  if (error) throw new Error(`getPublishedPosts failed: ${error.message}`);
  const total = count ?? 0;
  return { posts: data, total, page, pageCount: Math.max(1, Math.ceil(total / BLOG_PAGE_SIZE)) };
};

const fetchPostBySlug: PostsDriver["fetchPostBySlug"] = async (slug) => {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("posts")
    .select(`${DETAIL_COLUMNS},${AUTHOR}`)
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<DetailRow, { merge: false }>();
  if (error) throw new Error(`getPostBySlug failed: ${error.message}`);
  if (!data) return null;

  // Links are readable only while the post is published (RLS); the properties go through the catalog's own
  // reads, so only published ones come back (a «sold» one is dropped).
  const links = await supabase
    .from("post_properties")
    .select("property_id,position")
    .eq("post_id", data.id)
    .order("position")
    .limit(BLOG_RELATED_MAX);
  if (links.error) throw new Error(`getPostBySlug links failed: ${links.error.message}`);
  const found = await supabasePropertiesDriver.fetchPropertiesByIds(links.data.map((link) => link.property_id));
  const related: PublishedProperty[] = found.filter((item) => item.kind === "published").map((item) => item.property);

  return { ...data, related };
};

const fetchLatestPosts: PostsDriver["fetchLatestPosts"] = async (count) => {
  const { data, error } = await createPublicClient()
    .from("posts")
    .select(LIST_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .order("id")
    .limit(Math.max(0, count))
    .overrideTypes<PostListItem[], { merge: false }>();
  if (error) throw new Error(`getLatestPosts failed: ${error.message}`);
  return data;
};

const fetchSitemapPosts: PostsDriver["fetchSitemapPosts"] = async () => {
  const { data, error } = await createPublicClient()
    .from("posts")
    .select("slug,updated_at")
    .eq("status", "published")
    .eq("noindex", false)
    .order("updated_at", { ascending: false })
    .order("id")
    .overrideTypes<SitemapPost[], { merge: false }>();
  if (error) throw new Error(`getSitemapPosts failed: ${error.message}`);
  return data;
};

export const supabasePostsDriver: PostsDriver = {
  fetchPublishedPosts,
  fetchPostBySlug,
  fetchLatestPosts,
  fetchSitemapPosts,
};
