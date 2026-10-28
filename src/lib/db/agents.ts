import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { Database } from "@/lib/supabase/database.types";
import { CACHE_TAGS } from "./cache-tags";

export type Agent = Pick<
  Database["public"]["Tables"]["agents"]["Row"],
  "id" | "name" | "phones" | "email" | "photo_url"
>;

const fetchActiveAgents = async (): Promise<Agent[]> => {
  const { data, error } = await createPublicClient()
    .from("agents")
    .select("id, name, phones, email, photo_url")
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error(`getActiveAgents failed: ${error.message}`);
  return data;
};

/** Active agents, ordered by name. Cached under `agents`. */
export const getActiveAgents = (): Promise<Agent[]> =>
  unstable_cache(fetchActiveAgents, ["active-agents"], {
    tags: [CACHE_TAGS.agents],
  })();
