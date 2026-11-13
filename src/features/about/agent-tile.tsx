import { Mail, Phone } from "lucide-react";

import { ABOUT_PAGE } from "@/constants/inner-pages";
import type { Agent } from "@/lib/db/agents";
import { toTel } from "@/lib/format/to-tel";
import { photoUrl } from "@/lib/photos/photo-url";

const LINK =
  "inline-flex min-h-11 items-center gap-2 rounded-md break-all text-foreground outline-none hover:text-dawn-text focus-visible:ring-3 focus-visible:ring-ring/50";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

/** One agent: photo or initials, name, role, phone and email links. */
export const AgentTile = ({ agent }: { agent: Agent }) => {
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
        <h3 className="font-sans text-lg font-semibold break-words">{agent.name}</h3>
        <p className="text-sm text-muted-foreground">{ABOUT_PAGE.teamRole}</p>
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
