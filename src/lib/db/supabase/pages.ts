import "server-only";
import { createPublicClient } from "@/lib/supabase/public";
import type { PagesDriver } from "../driver-types";
import type { Page } from "../pages";

const fetchPage = async (slug: string): Promise<Page | null> => {
  const { data, error } = await createPublicClient()
    .from("pages")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`getPage failed: ${error.message}`);
  return data;
};

export const supabasePagesDriver: PagesDriver = { fetchPage };
