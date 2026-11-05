import "server-only";
import type { Agent } from "@/lib/db/agents";
import type { AgentsDriver } from "@/lib/db/driver-types";
import { getDemoStore } from "../store";

const nameCollator = new Intl.Collator("uk");

/** Policy "public reads active agents": only `is_active` rows, ordered by name. */
const fetchActiveAgents = async (): Promise<Agent[]> =>
  getDemoStore()
    .agents.filter((agent) => agent.is_active)
    .sort((a, b) => nameCollator.compare(a.name, b.name))
    .map(({ id, name, phones, email, photo_url }) => ({ id, name, phones: [...phones], email, photo_url }));

export const demoAgentsDriver: AgentsDriver = { fetchActiveAgents };
