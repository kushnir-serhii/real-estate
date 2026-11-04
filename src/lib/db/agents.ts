import "server-only";
import { unstable_cache } from "next/cache";
import { getCacheScope, isDemoMode } from "@/lib/data-driver";
import type { Database } from "@/lib/supabase/database.types";
import { CACHE_TAGS } from "./cache-tags";
import type { AgentsDriver } from "./driver-types";

export type Agent = Pick<
  Database["public"]["Tables"]["agents"]["Row"],
  "id" | "name" | "phones" | "email" | "photo_url"
>;

const loadDriver = async (): Promise<AgentsDriver> =>
  isDemoMode()
    ? (await import("@/lib/demo/db/agents")).demoAgentsDriver
    : (await import("@/lib/db/supabase/agents")).supabaseAgentsDriver;

/** Active agents, ordered by name. Cached under `agents`. */
export const getActiveAgents = (): Promise<Agent[]> =>
  unstable_cache(
    async () => (await loadDriver()).fetchActiveAgents(),
    ["active-agents", getCacheScope()],
    { tags: [CACHE_TAGS.agents] },
  )();
