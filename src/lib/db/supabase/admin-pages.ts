import "server-only";
import type { PageContent } from "@/constants/pages";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminPagesDriver } from "../driver-types";
import type { Page } from "../pages";

const fetchPageRows = async (slugs: readonly string[]): Promise<Page[]> => {
  const { data, error } = await createAdminClient()
    .from("pages")
    .select("*")
    .in("slug", [...slugs]);
  if (error) throw new Error(`listAdminPages failed: ${error.message}`);
  return data;
};

const fetchPageRow = async (slug: string): Promise<Page | null> => {
  const { data, error } = await createAdminClient().from("pages").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error(`getAdminPage failed: ${error.message}`);
  return data;
};

const upsertPage = async (slug: string, content: PageContent): Promise<void> => {
  const { error } = await createAdminClient()
    .from("pages")
    .upsert({ slug, ...content }, { onConflict: "slug" });
  if (error) throw new Error(`saveAdminPage failed: ${error.message}`);
};

const deletePage = async (slug: string): Promise<void> => {
  const { error } = await createAdminClient().from("pages").delete().eq("slug", slug);
  if (error) throw new Error(`resetAdminPage failed: ${error.message}`);
};

export const supabaseAdminPagesDriver: AdminPagesDriver = { fetchPageRows, fetchPageRow, upsertPage, deletePage };
