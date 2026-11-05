import { SectionHeading } from "@/components/section-heading";
import { ABOUT_PAGE } from "@/constants/inner-pages";
import { AgentTile } from "@/features/home/home-agents";
import { getActiveAgents } from "@/lib/db/agents";
import type { Agent } from "@/lib/db/agents";

/** Active agents for «Про нас». Renders nothing when there are none or the load fails (the page must not break). */
export const AboutTeam = async () => {
  let agents: Agent[];
  try {
    agents = await getActiveAgents();
  } catch (error) {
    console.error("About team failed to load", error);
    return null;
  }
  if (agents.length === 0) return null;

  return (
    <section aria-labelledby="team-title" className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4">
      <SectionHeading
        id="team-title"
        eyebrow={ABOUT_PAGE.teamEyebrow}
        title={ABOUT_PAGE.teamTitle}
        description={ABOUT_PAGE.teamDescription}
      />
      <ul className="grid gap-4 sm:grid-cols-2">
        {agents.map((agent) => (
          <li key={agent.id}>
            <AgentTile agent={agent} />
          </li>
        ))}
      </ul>
    </section>
  );
};
