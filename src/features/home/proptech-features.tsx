import { Heart, RefreshCw, Send } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { SectionHeading } from "@/components/section-heading";
import { PROPTECH } from "@/constants/home";
import { cn } from "@/lib/utils";
import { HomeSection } from "./home-section";
import { OpenAssistantButton } from "./open-assistant-button";

const ICONS: Record<(typeof PROPTECH.features)[number]["icon"], LucideIcon> = {
  refresh: RefreshCw,
  send: Send,
  heart: Heart,
};

/** Column span per feature at lg: the grid reads as a bento (big consultant card + 3 smaller ones). */
const SPANS = ["lg:col-span-1", "lg:col-span-1", "lg:col-span-2"] as const;

const CARD =
  "group/card flex flex-col gap-4 rounded-3xl bg-card p-6 text-card-foreground ring-1 ring-foreground/10 transition-[transform,box-shadow] duration-(--duration-base) ease-(--ease-out-soft) hover:-translate-y-1 hover:shadow-float motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-8";

export const ProptechFeatures = () => (
  <HomeSection labelledBy="proptech-title">
    <div className="flex flex-col gap-10">
      <div className="reveal">
        <SectionHeading
          id="proptech-title"
          eyebrow={PROPTECH.eyebrow}
          title={PROPTECH.title}
          description={PROPTECH.description}
        />
      </div>
      <ul className="reveal-stagger grid gap-4 lg:grid-cols-3 lg:gap-6">
        <li className="lg:col-span-2">
          <article className="relative isolate flex h-full flex-col justify-between gap-8 overflow-hidden rounded-3xl bg-ink p-6 text-on-ink sm:p-8">
            {/* glow: sky from the top right, a warm dawn edge at the bottom left */}
            <span
              aria-hidden="true"
              className="absolute -top-24 -right-16 -z-10 size-96 rounded-full bg-sky/40 blur-3xl"
            />
            <span
              aria-hidden="true"
              className="absolute -bottom-32 -left-20 -z-10 size-80 rounded-full bg-dawn/20 blur-3xl"
            />
            <div className="flex flex-col gap-4">
              <h3 className="text-h3 max-w-md">{PROPTECH.assistant.title}</h3>
              <p className="max-w-md text-ink-muted">{PROPTECH.assistant.text}</p>
            </div>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="w-fit">
                <OpenAssistantButton label={PROPTECH.assistant.cta} />
              </div>
              <p
                aria-hidden="true"
                className="max-w-60 rounded-2xl rounded-br-sm border border-ink-border bg-on-ink/10 px-4 py-3 text-sm text-on-ink"
              >
                {PROPTECH.assistant.preview}
              </p>
            </div>
          </article>
        </li>
        {PROPTECH.features.map((feature, index) => {
          const Icon = ICONS[feature.icon];
          return (
            <li key={feature.title} className={cn(SPANS[index])}>
              <article className={cn(CARD, "h-full")}>
                <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-dawn-text transition-colors duration-(--duration-base) group-hover/card:bg-dawn group-hover/card:text-dawn-foreground">
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <h3 className="text-h3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.text}</p>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  </HomeSection>
);
