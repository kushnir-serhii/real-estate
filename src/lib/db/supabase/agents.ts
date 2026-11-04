import "server-only";
import { createPublicClient } from "@/lib/supabase/public";
import type { Agent } from "../agents";
import type { AgentsDriver } from "../driver-types";

const fetchActiveAgents = async (): Promise<Agent[]> => {
  const { data, error } = await createPublicClient()
    .from("agents")
    .select("id, name, phones, email, photo_url")
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error(`getActiveAgents failed: ${error.message}`);
  return data;
};

export const supabaseAgentsDriver: AgentsDriver = { fetchActiveAgents };
