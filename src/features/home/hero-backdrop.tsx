import { HERO } from "@/constants/home";

import { HeroBlueprint } from "./hero-blueprint";
import { HeroTraceFrame } from "./hero-trace-frame";

/**
 * The villa photo and the drawing traced from it, in one frame: the drawing builds itself on midnight, a scan line
 * develops the photo through it, the lines dim onto the edges, then both drift. Pure CSS; without motion it is the final picture.
 */
export const HeroTracedScene = () => (
  <>
    <div className="hero-develop absolute inset-0">
      <HeroTraceFrame className="hero-drift">
        {/* eslint-disable-next-line @next/next/no-img-element -- static placeholder from public/; Workers has no image optimizer */}
        <img
          src={HERO.image.src}
          alt=""
          width={HERO.image.width}
          height={HERO.image.height}
          fetchPriority="high"
          decoding="async"
          sizes="100vw"
          className="absolute inset-0 size-full"
        />
      </HeroTraceFrame>
    </div>
    <HeroTraceFrame className="hero-drift pointer-events-none">
      <HeroBlueprint />
    </HeroTraceFrame>
  </>
);

/** The scene, the text veil and the scan line (the lab shows this under its own copy). */
export const HeroBackdrop = () => (
  <>
    <HeroTracedScene />
    <div className="hero-veil absolute inset-0" aria-hidden="true" />
    <div className="hero-scan absolute inset-0 border-r border-brand-on-ink" aria-hidden="true" />
  </>
);
