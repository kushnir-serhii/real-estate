import { HeroLabContent } from "./hero-lab-content";

const FRAMES = [
  { name: "Фасад", src: "/placeholders/house-exterior-2.webp", from: "scale(1.02)", to: "scale(1.14)" },
  {
    name: "Вітальня",
    src: "/placeholders/flat-living-1.webp",
    from: "scale(1.12) translate3d(-3%, 0, 0)",
    to: "scale(1.12) translate3d(3%, 0, 0)",
  },
  {
    name: "Спальня",
    src: "/placeholders/flat-bedroom-1.webp",
    from: "scale(1.1) translate3d(2%, 2%, 0)",
    to: "scale(1.16) translate3d(-2%, -1%, 0)",
  },
  { name: "Вид", src: "/placeholders/house-exterior-1.webp", from: "scale(1.15)", to: "scale(1.03)" },
] as const;

/** The progress strip: one line per frame, filling over its 6 s. The stage renders it next to the pause button. */
export const HeroLabABars = () =>
  FRAMES.map((f) => (
    <div key={f.name} className="lab-bar">
      <div className="h-0.5 bg-on-scrim/30">
        <div className="lab-bar-fill h-full bg-on-scrim" />
      </div>
      <span className="mt-2 block truncate text-xs text-on-scrim/80">{f.name}</span>
    </div>
  ));

/** A: four frames, 6 s each, a slow camera move per frame, a vertical curtain between them, a 24 s CSS loop. */
export const HeroLabA = () => (
  <>
    <div className="absolute inset-0 isolate overflow-hidden" aria-hidden="true">
      {FRAMES.map((f, i) => (
        <div key={f.name} className="lab-frame absolute inset-0" style={{ "--n": i } as React.CSSProperties}>
          {/* eslint-disable-next-line @next/next/no-img-element -- lab page, static placeholder */}
          <img
            src={f.src}
            alt=""
            width={1280}
            height={853}
            fetchPriority={i === 0 ? "high" : "low"}
            loading="eager"
            decoding="async"
            className="lab-cam size-full object-cover"
            style={{ "--n": i, "--cam-from": f.from, "--cam-to": f.to } as React.CSSProperties}
          />
        </div>
      ))}
    </div>
    <div className="hero-veil absolute inset-0" aria-hidden="true" />
    <HeroLabContent start={200} className="pb-28" />
  </>
);
