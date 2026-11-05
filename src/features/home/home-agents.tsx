import { ArrowRight, Mail, Phone } from "lucide-react";
import Link from "next/link";

import { SectionHeading } from "@/components/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AGENTS } from "@/constants/home";
import { getActiveAgents } from "@/lib/db/agents";
import type { Agent } from "@/lib/db/agents";
import { toTel } from "@/lib/format/to-tel";
import { photoUrl } from "@/lib/photos/photo-url";
import { HomeSection } from "./home-section";

const LINK =
  "inline-flex min-h-11 items-center gap-2 rounded-md break-all text-foreground outline-none hover:text-dawn-text focus-visible:ring-3 focus-visible:ring-ring/50";

const LIST =
  "-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:gap-6";
const ITEM = "w-64 shrink-0 snap-start sm:w-auto";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

const AgentTile = ({ agent }: { agent: Agent }) => {
  const phone = agent.phones[0];
  return (
    <article className="flex h-full flex-col items-center gap-3 rounded-3xl bg-card p-6 text-center text-card-foreground ring-1 ring-foreground/10">
      {agent.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- external photo in a fixed-size box
        <img
          src={photoUrl(agent.photo_url)}
          alt=""
          width={96}
          height={96}
          loading="lazy"
          className="size-24 rounded-full bg-muted object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex size-24 items-center justify-center rounded-full bg-dawn font-heading text-2xl font-semibold text-dawn-foreground"
        >
          {initials(agent.name)}
        </span>
      )}
      <div className="flex min-w-0 flex-col">
        <h3 className="text-lg font-semibold break-words">{agent.name}</h3>
        <p className="text-sm text-muted-foreground">{AGENTS.role}</p>
      </div>
      <div className="mt-auto flex min-w-0 flex-col items-center">
        {phone ? (
          <a href={`tel:${toTel(phone)}`} className={`${LINK} tabular-nums`}>
            <Phone className="size-4 shrink-0" aria-hidden="true" />
            {phone}
          </a>
        ) : null}
        {agent.email ? (
          <a href={`mailto:${agent.email}`} className={`${LINK} text-sm`}>
            <Mail className="size-4 shrink-0" aria-hidden="true" />
            {agent.email}
          </a>
        ) : null}
      </div>
    </article>
  );
};

const Frame = ({ children }: { children: React.ReactNode }) => (
  <HomeSection labelledBy="agents-title">
    <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-center lg:gap-16">
      <div className="reveal flex flex-col items-start gap-6">
        <SectionHeading
          id="agents-title"
          eyebrow={AGENTS.eyebrow}
          title={AGENTS.title}
          description={AGENTS.description}
        />
        <Link href={AGENTS.ctaHref} className={buttonVariants({ variant: "dawn", size: "lg" })}>
          {AGENTS.cta}
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Link>
      </div>
      {children}
    </div>
  </HomeSection>
);

/** Up to four active agents. Renders nothing when there are none or the load fails (the page must not break). */
export const HomeAgents = async () => {
  let agents: Agent[];
  try {
    agents = (await getActiveAgents()).slice(0, AGENTS.max);
  } catch (error) {
    console.error("Home agents failed to load", error);
    return null;
  }
  if (agents.length === 0) return null;

  return (
    <Frame>
      <ul className={LIST}>
        {agents.map((agent) => (
          <li key={agent.id} className={ITEM}>
            <AgentTile agent={agent} />
          </li>
        ))}
      </ul>
    </Frame>
  );
};

const SKELETON_KEYS = ["a", "b"] as const;

export const HomeAgentsSkeleton = () => (
  <Frame>
    <ul className={LIST} aria-hidden="true">
      {SKELETON_KEYS.map((key) => (
        <li key={key} className={ITEM}>
          <div className="flex flex-col items-center gap-3 rounded-3xl bg-card p-6 ring-1 ring-foreground/10">
            <Skeleton className="size-24 rounded-full" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-11 w-3/4" />
          </div>
        </li>
      ))}
    </ul>
  </Frame>
);
