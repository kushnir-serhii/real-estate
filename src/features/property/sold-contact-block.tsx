import { Phone } from "lucide-react";

import { MessengerLinks } from "@/components/layout/messenger-links";
import { buttonVariants } from "@/components/ui/button";
import { CONTACTS } from "@/constants/contacts";
import { cn } from "@/lib/utils";
import { CONTACT_ANCHOR } from "./property-details";

type SoldContactBlockProps = { className?: string };

/**
 * «Підберемо схожий»: the agency's phone and messengers (never the property's agent: the deal is closed).
 * Same `#kontakt` anchor as the live page; spec 006 may put the request form here.
 */
export const SoldContactBlock = ({ className }: SoldContactBlockProps) => (
  <section
    id={CONTACT_ANCHOR}
    aria-labelledby={`${CONTACT_ANCHOR}-title`}
    className={cn("scroll-mt-24 rounded-xl bg-card p-5 text-card-foreground ring-1 ring-foreground/10", className)}
  >
    <h2 id={`${CONTACT_ANCHOR}-title`} className="text-lg font-bold">
      Підберемо схожий
    </h2>
    <p className="mt-2 text-muted-foreground">
      Розкажіть, що шукаєте: зателефонуйте або напишіть, і ми надішлемо підходящі варіанти.
    </p>
    <a href={CONTACTS.phone.href} className={cn(buttonVariants({ size: "lg" }), "mt-4 w-full tabular-nums")}>
      <Phone aria-hidden="true" />
      {CONTACTS.phone.display}
    </a>
    <p className="mt-4 text-sm text-muted-foreground">Або напишіть нам у месенджер:</p>
    <MessengerLinks className="mt-2" />
  </section>
);
