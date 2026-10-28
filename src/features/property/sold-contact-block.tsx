import { Phone } from "lucide-react";

import { MessengerLinks } from "@/components/layout/messenger-links";
import { buttonVariants } from "@/components/ui/button";
import { CONTACTS } from "@/constants/contacts";
import { GeneralRequestForm } from "@/features/leads/general-request-form";
import type { LeadDeal } from "@/features/leads/lead-form-schema";
import type { PublishedProperty } from "@/lib/db/properties";
import { cn } from "@/lib/utils";
import { CONTACT_ANCHOR } from "./property-details";

type SoldContactBlockProps = {
  /** The sold property: the request asks for something similar to it. */
  propertyId: string;
  deal: PublishedProperty["deal"];
  className?: string;
};

const leadDealOf = (deal: PublishedProperty["deal"]): LeadDeal => {
  switch (deal) {
    case "sell":
      return "buy";
    case "rent_long":
    case "rent_day":
      return "rent";
    default: {
      const unreachable: never = deal;
      return unreachable;
    }
  }
};

/**
 * «Підберемо схожий»: a general request tied to the sold property, then the agency's phone and messengers
 * (never the property's agent: the deal is closed). Same `#kontakt` anchor as the live page.
 */
export const SoldContactBlock = ({ propertyId, deal, className }: SoldContactBlockProps) => (
  <section
    id={CONTACT_ANCHOR}
    aria-labelledby={`${CONTACT_ANCHOR}-title`}
    className={cn("scroll-mt-24 rounded-xl bg-card p-5 text-card-foreground ring-1 ring-foreground/10", className)}
  >
    <h2 id={`${CONTACT_ANCHOR}-title`} className="text-lg font-bold">
      Підберемо схожий
    </h2>
    <p className="mt-2 text-muted-foreground">
      Розкажіть, що шукаєте, і ми надішлемо підходящі варіанти.
    </p>
    <GeneralRequestForm similarTo={propertyId} defaultDeal={leadDealOf(deal)} className="mt-5" />

    <div className="mt-6 border-t pt-5">
      <p className="text-sm text-muted-foreground">Або зателефонуйте:</p>
      <a
        href={CONTACTS.phone.href}
        className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-2 w-full tabular-nums")}
      >
        <Phone aria-hidden="true" />
        {CONTACTS.phone.display}
      </a>
      <p className="mt-4 text-sm text-muted-foreground">Чи напишіть у месенджер:</p>
      <MessengerLinks className="mt-2" />
    </div>
  </section>
);
