import { Phone } from "lucide-react";

import { MessengerLinks } from "@/components/layout/messenger-links";
import { buttonVariants } from "@/components/ui/button";
import { CONTACTS } from "@/constants/contacts";
import { HOME_CTA } from "@/constants/home";
import { cn } from "@/lib/utils";
import { HomeSection } from "./home-section";
import { GeneralRequestForm } from "@/features/leads/general-request-form";

/** «Не знайшли потрібне?»: ink panel with a dawn line; heading and contacts left, the request form right. */
export const HomeCta = () => (
  <HomeSection labelledBy="home-cta-title">
    <div className="reveal relative isolate grid gap-8 overflow-hidden rounded-3xl bg-ink p-4 text-on-ink sm:p-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:gap-10 lg:p-10">
      <span
        aria-hidden="true"
        className="absolute -top-24 -right-16 -z-10 size-96 rounded-full bg-sky/30 blur-3xl"
      />
      <div className="flex flex-col gap-4 px-2 pt-2 sm:p-0">
        <span aria-hidden="true" className="h-1 w-12 rounded-full bg-dawn" />
        <h2 id="home-cta-title" className="text-h2">
          {HOME_CTA.title}
        </h2>
        <p className="max-w-2xl text-ink-muted">{HOME_CTA.lead}</p>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={CONTACTS.phone.href}
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "border-ink-border bg-transparent text-on-ink hover:bg-on-ink/10 hover:text-on-ink",
            )}
          >
            <Phone aria-hidden="true" />
            <span className="tabular-nums">{CONTACTS.phone.display}</span>
          </a>
          <MessengerLinks tone="ink" />
        </div>
      </div>
      <div className="rounded-2xl bg-card p-5 text-card-foreground ring-1 ring-foreground/10 sm:p-6">
        <GeneralRequestForm title="Залишити заявку" />
      </div>
    </div>
  </HomeSection>
);
