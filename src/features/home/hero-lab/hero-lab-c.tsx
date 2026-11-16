import { BlueprintElevation } from "./blueprint-elevation";
import { HeroLabContent } from "./hero-lab-content";

/** C: the drawing builds itself on midnight (~3.4 s), a scan line develops the photo through it (2.6-5 s), the drawing dims. */
export const HeroLabC = () => (
  <>
    <div className="lab-develop absolute inset-0">
      {/* eslint-disable-next-line @next/next/no-img-element -- lab page, static placeholder */}
      <img
        src="/placeholders/house-exterior-2.webp"
        alt=""
        width={1280}
        height={853}
        fetchPriority="high"
        decoding="async"
        className="lab-drift size-full object-cover [--drift-delay:2600ms]"
      />
      <div className="hero-veil absolute inset-0" aria-hidden="true" />
    </div>
    <BlueprintElevation className="pointer-events-none absolute inset-x-0 top-20 h-[52%] w-full sm:inset-y-0 sm:top-0 sm:h-full lg:left-[34%] lg:w-[66%]" />
    <div
      className="lab-scan absolute inset-0 border-r border-brand-on-ink motion-reduce:hidden"
      aria-hidden="true"
    />
    <HeroLabContent start={400} />
  </>
);
