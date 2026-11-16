import { HeroLabContent } from "./hero-lab-content";

const PANELS = 6;

/** B: tall midnight doors part from the centre outwards (1.6 s), the photo behind drifts for 20 s, alternating. */
export const HeroLabB = () => (
  <>
    {/* eslint-disable-next-line @next/next/no-img-element -- lab page, static placeholder */}
    <img
      src="/placeholders/flat-living-2.webp"
      alt=""
      width={1280}
      height={853}
      fetchPriority="high"
      decoding="async"
      className="lab-drift absolute inset-0 size-full object-cover"
    />
    <div className="hero-veil absolute inset-0" aria-hidden="true" />
    <div className="absolute inset-0 z-[5] flex motion-reduce:hidden" aria-hidden="true">
      {Array.from({ length: PANELS }, (_, i) => {
        const left = i < PANELS / 2;
        const k = left ? i + 1 : PANELS - i;
        const central = k === PANELS / 2;
        return (
          <div
            key={i}
            className="lab-door relative h-full flex-1 border-r border-ink-border bg-ink"
            style={{ "--dir": left ? -1 : 1, "--k": k } as React.CSSProperties}
          >
            <div className="absolute inset-x-3 inset-y-6 border border-brand-on-ink/40 sm:inset-x-5 sm:inset-y-10" />
            <div className="absolute inset-x-5 inset-y-8 border border-on-ink/10 sm:inset-x-8 sm:inset-y-13" />
            {central ? (
              <div
                className={`absolute inset-y-6 flex gap-2 sm:inset-y-10 ${left ? "right-6 sm:right-10" : "left-6 sm:left-10"}`}
              >
                {[0, 1, 2].map((n) => (
                  <span key={n} className="w-px bg-brand-on-ink/50" />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
    <HeroLabContent start={900} />
  </>
);
