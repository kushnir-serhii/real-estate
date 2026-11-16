import { HERO } from "@/constants/home";

import { HeroBackdrop } from "./hero-backdrop";

/** The title as one heading: every word sits in its own mask so it can rise on load (CSS only, plain text in the HTML). */
const MaskedWords = ({ text }: { text: string }) =>
  text.split(/\s+/).filter(Boolean).map((word, i, words) => (
    <span key={i}>
      <span className="hero-word">
        <span className="hero-word-inner" style={{ "--i": i } as React.CSSProperties}>
          {word}
        </span>
      </span>
      {i < words.length - 1 ? " " : null}
    </span>
  ));

type HeroProps = { title: string; lead: string; children: React.ReactNode };

/** The H1 and the quick search (`children`) are the whole hero: search is the one main action. */
export const Hero = ({ title, lead, children }: HeroProps) => (
  <section
    data-hero
    className="hero-height relative isolate -mt-header flex flex-col justify-end overflow-hidden bg-ink"
  >
    <div className="absolute inset-0 -z-10" aria-hidden="true">
      <HeroBackdrop />
    </div>
    <div className="site-container flex flex-col items-start gap-4 pt-28 pb-8 text-on-scrim sm:gap-5 sm:pt-34 sm:pb-12">
      <p className="eyebrow hero-wipe text-on-scrim/90">{HERO.eyebrow}</p>
      <h1 className="text-display max-w-4xl">
        <MaskedWords text={title} />
      </h1>
      <p
        className="hero-wipe max-w-2xl text-base text-pretty text-on-scrim/90 sm:text-lg"
        style={{ "--hero-delay": "600ms" } as React.CSSProperties}
      >
        {lead}
      </p>
      <div className="hero-wipe mt-2 w-full sm:mt-4" style={{ "--hero-delay": "760ms" } as React.CSSProperties}>
        {children}
      </div>
    </div>
  </section>
);
