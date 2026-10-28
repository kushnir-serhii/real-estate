import { Phone } from "lucide-react";

import { MessengerLinks } from "@/components/layout/messenger-links";
import { buttonVariants } from "@/components/ui/button";
import { CONTACTS } from "@/constants/contacts";
import { GeneralRequestForm } from "@/features/leads/general-request-form";

/** «Не знайшли потрібне?»: a request form, with the phone and messengers as the other way to reach us. */
export const HomeCta = () => (
  <section
    aria-labelledby="home-cta-title"
    className="grid gap-6 rounded-xl bg-secondary p-4 text-secondary-foreground sm:p-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:gap-10"
  >
    <div className="flex flex-col gap-4 px-2 pt-2 sm:p-0">
      <h2 id="home-cta-title" className="text-2xl font-bold text-balance">
        Не знайшли потрібне?
      </h2>
      <p className="max-w-2xl">
        Розкажіть, що шукаєте, і ми підберемо варіанти. Залиште заявку або зателефонуйте чи напишіть.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <a href={CONTACTS.phone.href} className={buttonVariants({ variant: "outline", size: "lg" })}>
          <Phone aria-hidden="true" />
          <span className="tabular-nums">{CONTACTS.phone.display}</span>
        </a>
        <MessengerLinks />
      </div>
    </div>
    <div className="rounded-xl bg-card p-5 text-card-foreground ring-1 ring-foreground/10 sm:p-6">
      <GeneralRequestForm title="Залишити заявку" />
    </div>
  </section>
);
