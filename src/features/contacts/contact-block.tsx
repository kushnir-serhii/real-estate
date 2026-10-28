import { Clock, Mail, MapPin } from "lucide-react";

import { MessengerLinks } from "@/components/layout/messenger-links";
import { SITE_CONFIG } from "@/lib/site-config";

const LINK_CLASS =
  "inline-flex min-h-11 items-center rounded-md break-all text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50";

export const ContactBlock = () => (
  <section
    id="zv-yazok"
    aria-labelledby="zv-yazok-title"
    className="scroll-mt-24 rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-8"
  >
    <h2 id="zv-yazok-title" className="text-2xl font-bold">
      Зателефонуйте або напишіть
    </h2>
    <div className="mt-5 flex flex-col gap-5">
      <a
        href={SITE_CONFIG.phone.href}
        className="inline-flex min-h-11 items-center self-start rounded-md text-3xl font-bold tabular-nums text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-4xl"
      >
        {SITE_CONFIG.phone.display}
      </a>
      <MessengerLinks />
      <ul className="flex flex-col gap-1 text-muted-foreground">
        <li className="flex items-center gap-3">
          <Mail className="size-4 shrink-0" aria-hidden="true" />
          <a href={`mailto:${SITE_CONFIG.email}`} className={LINK_CLASS}>
            {SITE_CONFIG.email}
          </a>
        </li>
        <li className="flex items-start gap-3 py-2">
          <MapPin className="mt-1 size-4 shrink-0" aria-hidden="true" />
          <span className="break-words">{SITE_CONFIG.address}</span>
        </li>
        <li className="flex items-start gap-3 py-2">
          <Clock className="mt-1 size-4 shrink-0" aria-hidden="true" />
          <span className="break-words">{SITE_CONFIG.hours}</span>
        </li>
      </ul>
    </div>
  </section>
);
