import { Building2, Phone, User } from "lucide-react";

import { MessengerLinks } from "@/components/layout/messenger-links";
import { buttonVariants } from "@/components/ui/button";
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

const OTHER_PHONE =
  "inline-flex min-h-11 items-center gap-2 self-start rounded-md font-semibold text-on-ink tabular-nums outline-none hover:text-dawn focus-visible:ring-3 focus-visible:ring-dawn/60";

/**
 * Who to contact about this property: its agent, else the agency; agency messengers always.
 * An ink (midnight) card under the request form (`#zayavka`), which the «Залишити заявку» CTA points to.
 */
export const PropertyContactCard = ({ agent, className }: PropertyContactCardProps) => {
  const phones = agent?.phones.length
    ? agent.phones.map((phone) => ({ display: phone, href: `tel:${toTel(phone)}` }))
    : [CONTACTS.phone];
  const [main, ...others] = phones;

  return (
    <section
      id={CONTACT_ANCHOR}
      aria-labelledby={`${CONTACT_ANCHOR}-title`}
      className={cn("scroll-mt-24 rounded-2xl bg-ink p-6 text-on-ink ring-1 ring-ink-border", className)}
    >
      <h2 id={`${CONTACT_ANCHOR}-title`} className="eyebrow text-dawn">
        Зв&apos;язатися щодо об&apos;єкта
      </h2>

      <div className="mt-5 flex items-center gap-4">
        {agent?.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- small photo in a fixed-size box
          <img
            src={photoUrl(agent.photo_url)}
            alt=""
            width={64}
            height={64}
            loading="lazy"
            className="size-16 shrink-0 rounded-full bg-muted object-cover ring-2 ring-dawn"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-on-ink/10 text-on-ink ring-2 ring-dawn"
          >
            {agent ? <User className="size-7" /> : <Building2 className="size-7" />}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-lg leading-snug font-semibold break-words">
            {agent ? agent.name : `Агентство ${BRAND.name}`}
          </p>
          <p className="text-sm text-ink-muted">{agent ? "Агент з нерухомості" : "Відповімо на ваші питання"}</p>
        </div>
      </div>

      <a href={main.href} className={cn(buttonVariants({ variant: "dawn", size: "lg" }), "mt-5 w-full tabular-nums")}>
        <Phone aria-hidden="true" />
        {main.display}
      </a>
      {others.length > 0 && (
        <ul className="mt-2 flex flex-col">
          {others.map((phone) => (
            <li key={phone.href}>
              <a href={phone.href} className={OTHER_PHONE}>
                <Phone className="size-4" aria-hidden="true" />
                {phone.display}
              </a>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-5 text-sm text-ink-muted">Або напишіть нам у месенджер:</p>
      <MessengerLinks className="mt-2" tone="ink" />
    </section>
  );
};
