import { Clock, Mail, MapPin, Phone } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { MessengerLinks } from "@/components/layout/messenger-links";
import { CONTACTS } from "@/constants/contacts";
import { CONTACTS_PAGE } from "@/constants/inner-pages";

const LINK_CLASS =
  "inline-flex min-h-11 items-center rounded-md break-all text-foreground underline-offset-4 outline-none hover:text-dawn-text hover:underline focus-visible:ring-3 focus-visible:ring-ring/50";

const IconBadge = ({ icon: Icon }: { icon: LucideIcon }) => (
  <span
    aria-hidden="true"
    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-dawn-text"
  >
    <Icon className="size-4" />
  </span>
);

export const ContactBlock = () => (
  <section
    id="zv-yazok"
    aria-labelledby="zv-yazok-title"
    className="scroll-mt-24 rounded-2xl bg-card p-6 ring-1 ring-foreground/10 sm:p-8"
  >
    <h2 id="zv-yazok-title" className="text-h3">
      {CONTACTS_PAGE.contactTitle}
    </h2>
    <div className="mt-6 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <IconBadge icon={Phone} />
        <a
          href={CONTACTS.phone.href}
          className="inline-flex min-h-11 items-center rounded-md font-heading text-2xl font-semibold tabular-nums outline-none hover:text-dawn-text focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-3xl"
        >
          {CONTACTS.phone.display}
        </a>
      </div>
      <MessengerLinks />
      <ul className="flex flex-col gap-1 border-t border-border pt-5">
        <li className="flex items-center gap-3">
          <IconBadge icon={Mail} />
          <a href={`mailto:${CONTACTS.email}`} className={LINK_CLASS}>
            {CONTACTS.email}
          </a>
        </li>
        <li className="flex items-center gap-3 py-2">
          <IconBadge icon={MapPin} />
          <span className="break-words">{CONTACTS.address}</span>
        </li>
        <li className="flex items-center gap-3 py-2">
          <IconBadge icon={Clock} />
          <span className="break-words">{CONTACTS.hours}</span>
        </li>
      </ul>
    </div>
  </section>
);
