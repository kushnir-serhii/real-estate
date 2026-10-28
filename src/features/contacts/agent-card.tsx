import { User } from "lucide-react";

import type { Agent } from "@/lib/db/agents";
import { toTel } from "@/lib/format/to-tel";
import { photoUrl } from "@/lib/photos/photo-url";

const LINK_CLASS =
  "inline-flex min-h-11 items-center rounded-md break-all text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50";

export const AgentCard = ({ agent }: { agent: Agent }) => (
  <li className="flex gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
    {agent.photo_url ? (
      // eslint-disable-next-line @next/next/no-img-element -- external photo in a fixed-size box
      <img
        src={photoUrl(agent.photo_url)}
        alt={agent.name}
        width={64}
        height={64}
        loading="lazy"
        className="size-16 shrink-0 rounded-full bg-muted object-cover"
      />
    ) : (
      <div
        aria-hidden="true"
        className="flex size-16 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
      >
        <User className="size-7" />
      </div>
    )}
    <div className="flex min-w-0 flex-col">
      <h3 className="text-lg font-semibold break-words">{agent.name}</h3>
      {agent.phones.map((phone) => (
        <a key={phone} href={`tel:${toTel(phone)}`} className={`${LINK_CLASS} tabular-nums`}>
          {phone}
        </a>
      ))}
      {agent.email ? (
        <a href={`mailto:${agent.email}`} className={LINK_CLASS}>
          {agent.email}
        </a>
      ) : null}
    </div>
  </li>
);
