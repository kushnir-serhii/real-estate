import { BlueprintTrace } from "./blueprint-trace";
import { TracePhoto } from "./hero-lab-c";
import { HeroLabContent } from "./hero-lab-content";
import { HeroLabTrace } from "./hero-lab-trace";

/** Frames after the traced one: the same slow camera moves as in A. */
const FRAMES = [
  { src: "/placeholders/flat-living-1.webp", from: "scale(1.12) translate3d(-3%, 0, 0)", to: "scale(1.12) translate3d(3%, 0, 0)" },
  { src: "/placeholders/flat-bedroom-1.webp", from: "scale(1.1) translate3d(2%, 2%, 0)", to: "scale(1.16) translate3d(-2%, -1%, 0)" },
  { src: "/placeholders/house-exterior-2.webp", from: "scale(1.15)", to: "scale(1.03)" },
] as const;

/**
 * D: C's opening (drawing, scan, the traced photo; ~5 s), then A's loop without progress lines: a vertical curtain to
 * each next frame every 6 s (24 s CSS loop). Frame 1 is the traced photo, it comes back after the last frame.
 */
export const HeroLabD = () => (
  <>
    <div className="absolute inset-0 isolate overflow-hidden" aria-hidden="true">
      <div className="lab-frame lab-dframe-0 absolute inset-0">
        <div className="lab-develop absolute inset-0">
          <HeroLabTrace className="lab-drift [--drift-delay:2600ms]">
            <TracePhoto />
          </HeroLabTrace>
        </div>
        <HeroLabTrace className="lab-drift pointer-events-none [--drift-delay:2600ms]">
          <BlueprintTrace />
        </HeroLabTrace>
      </div>
      {FRAMES.map((f, i) => (
        <div key={f.src} className="lab-frame lab-dframe absolute inset-0" style={{ "--n": i } as React.CSSProperties}>
          {/* eslint-disable-next-line @next/next/no-img-element -- lab page, static placeholder */}
          <img
            src={f.src}
            alt=""
            width={1280}
            height={853}
            fetchPriority="low"
            loading="eager"
            decoding="async"
            className="lab-dcam size-full object-cover"
            style={{ "--n": i, "--cam-from": f.from, "--cam-to": f.to } as React.CSSProperties}
          />
        </div>
      ))}
    </div>
    <div className="hero-veil absolute inset-0" aria-hidden="true" />
    <div
      className="lab-scan absolute inset-0 border-r border-brand-on-ink motion-reduce:hidden"
      aria-hidden="true"
    />
    <HeroLabContent start={400} />
  </>
);
