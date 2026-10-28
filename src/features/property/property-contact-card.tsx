import { Building2, Phone, User } from "lucide-react";

import { MessengerLinks } from "@/components/layout/messenger-links";
import { BRAND } from "@/constants/brand";
import { CONTACTS } from "@/constants/contacts";
import type { PropertyAgent } from "@/lib/db/properties";
import { toTel } from "@/lib/format/to-tel";
import { photoUrl } from "@/lib/photos/photo-url";
import { cn } from "@/lib/utils";
import { CONTACT_ANCHOR } from "./property-details";

type PropertyContactCardProps = {
  agent: PropertyAgent | null;
  className?: string;
};

const PHONE_LINK =
  "inline-flex min-h-11 items-center gap-2 self-start rounded-md text-lg font-semibold text-primary tabular-nums outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * Who to contact about this property: its agent, else the agency; agency messengers always.
 * Sits under the request form (`#zayavka`), which the «Залишити заявку» CTA points to.
 */
export const PropertyContactCard = ({ agent, className }: PropertyContactCardProps) => {
  const phones = agent?.phones.length
    ? agent.phones.map((phone) => ({ display: phone, href: `tel:${toTel(phone)}` }))
    : [CONTACTS.phone];

  return (
    <section
      id={CONTACT_ANCHOR}
      aria-labelledby={`${CONTACT_ANCHOR}-title`}
      className={cn("scroll-mt-24 rounded-xl bg-card p-5 text-card-foreground ring-1 ring-foreground/10", className)}
    >
      <h2 id={`${CONTACT_ANCHOR}-title`} className="text-lg font-bold">
        Зв&apos;язатися щодо об&apos;єкта
      </h2>

      <div className="mt-4 flex items-center gap-3">
        {agent?.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- small photo in a fixed-size box
          <img
            src={photoUrl(agent.photo_url)}
            alt=""
            width={56}
            height={56}
            loading="lazy"
            className="size-14 shrink-0 rounded-full bg-muted object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
          >
            {agent ? <User className="size-6" /> : <Building2 className="size-6" />}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold break-words">{agent ? agent.name : `Агентство ${BRAND.name}`}</p>
          <p className="text-sm text-muted-foreground">{agent ? "Агент з нерухомості" : "Відповімо на ваші питання"}</p>
        </div>
      </div>

      <ul className="mt-3 flex flex-col">
        {phones.map((phone) => (
          <li key={phone.href}>
            <a href={phone.href} className={PHONE_LINK}>
              <Phone className="size-4" aria-hidden="true" />
              {phone.display}
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm text-muted-foreground">Або напишіть нам у месенджер:</p>
      <MessengerLinks className="mt-2" />
    </section>
  );
};
