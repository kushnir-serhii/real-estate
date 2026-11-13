import { ArrowRight, CalendarCheck, Handshake, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { CTA_LINK } from "@/components/layout/nav-config";
import { Button } from "@/components/ui/button";
import { HERO } from "@/constants/home";

type HeroProps = { title: string; lead: string };

const FACT_ICONS = {
  calendar: CalendarCheck,
  handshake: Handshake,
  shield: ShieldCheck,
} as const;

export const Hero = ({ title, lead }: HeroProps) => (
  <section
    data-hero
    className="hero-height relative isolate -mt-header flex flex-col justify-end overflow-hidden bg-ink"
  >
    {/* eslint-disable-next-line @next/next/no-img-element -- static placeholder from public/; Workers has no image optimizer */}
    <img
      src={HERO.image.src}
      alt=""
      width={HERO.image.width}
      height={HERO.image.height}
      fetchPriority="high"
      decoding="async"
      sizes="100vw"
      className="hero-zoom absolute inset-0 -z-20 size-full object-cover"
    />
    <div className="hero-veil absolute inset-0 -z-10" aria-hidden="true" />
    <div className="hero-stagger mx-auto flex w-full max-w-6xl flex-col items-start gap-5 px-4 pt-34 pb-28 text-on-scrim sm:gap-6 sm:pb-32">
      <p className="inline-flex max-w-full items-center gap-2 rounded-control bg-on-scrim/10 px-3.5 py-1.5 text-sm font-medium ring-1 ring-on-scrim/20 backdrop-blur">
        <span className="size-2 shrink-0 rounded-full bg-dawn" aria-hidden="true" />
        <span className="min-w-0">{HERO.eyebrow}</span>
      </p>
      <h1 className="text-display max-w-4xl">{title}</h1>
      <p className="max-w-2xl text-base text-pretty text-on-scrim/90 sm:text-lg">{lead}</p>
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Button asChild variant="dawn" size="lg">
          <Link href="/catalog">
            {HERO.primaryCta}
            <ArrowRight aria-hidden="true" data-icon="inline-end" />
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="lg"
          className="border-on-scrim/30 bg-on-scrim/10 text-on-scrim backdrop-blur hover:bg-on-scrim/20 hover:text-on-scrim dark:border-on-scrim/30 dark:bg-on-scrim/10 dark:hover:bg-on-scrim/20"
        >
          <Link href={CTA_LINK.href}>{CTA_LINK.label}</Link>
        </Button>
      </div>
      <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-1 text-sm">
        {HERO.facts.map((fact) => {
          const Icon = FACT_ICONS[fact.icon];
          return (
            <li key={fact.label} className="flex items-center gap-2">
              <Icon className="size-4 shrink-0 text-dawn" aria-hidden="true" />
              {fact.label}
            </li>
          );
        })}
      </ul>
    </div>
  </section>
);
