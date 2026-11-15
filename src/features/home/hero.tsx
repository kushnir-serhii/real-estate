import { HERO } from "@/constants/home";

type HeroProps = { title: string; lead: string; children: React.ReactNode };

/** The H1 and the quick search (`children`) are the whole hero: search is the one main action. */
export const Hero = ({ title, lead, children }: HeroProps) => (
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
    <div className="hero-stagger site-container flex flex-col items-start gap-4 pt-28 pb-8 text-on-scrim sm:gap-5 sm:pt-34 sm:pb-12">
      <p className="eyebrow text-on-scrim/90">{HERO.eyebrow}</p>
      <h1 className="text-display max-w-4xl">{title}</h1>
      <p className="max-w-2xl text-base text-pretty text-on-scrim/90 sm:text-lg">{lead}</p>
      <div className="mt-2 w-full sm:mt-4">{children}</div>
    </div>
  </section>
);
