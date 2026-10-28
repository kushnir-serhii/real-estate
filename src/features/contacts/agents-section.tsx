import "server-only";

import { RetryButton } from "@/features/home/retry-button";
import { getActiveAgents } from "@/lib/db/agents";
import type { Agent } from "@/lib/db/agents";
import { getSupabasePublicEnvOrNull } from "@/lib/supabase/env";
import { AgentCard } from "./agent-card";

type AgentsState = { kind: "ready"; items: Agent[] } | { kind: "hidden" } | { kind: "error" };

const loadAgents = async (): Promise<AgentsState> => {
  if (getSupabasePublicEnvOrNull() === null) return { kind: "hidden" };
  try {
    const items = await getActiveAgents();
    return items.length > 0 ? { kind: "ready", items } : { kind: "hidden" };
  } catch {
    return { kind: "error" };
  }
};

export const AgentsSection = async () => {
  const state = await loadAgents();

  switch (state.kind) {
    case "hidden":
      return null;
    case "ready":
      return (
        <section aria-labelledby="agents-title" className="flex flex-col gap-6">
          <h2 id="agents-title" className="text-2xl font-bold">
            Наші ріелтори
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {state.items.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </ul>
        </section>
      );
    case "error":
      return (
        <section aria-labelledby="agents-title" className="flex flex-col gap-6">
          <h2 id="agents-title" className="text-2xl font-bold">
            Наші ріелтори
          </h2>
          <div
            role="alert"
            className="flex flex-col items-start gap-4 rounded-xl border border-destructive/40 p-6"
          >
            <p className="font-medium text-destructive">Не вдалося завантажити ріелторів</p>
            <RetryButton />
          </div>
        </section>
      );
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
};
