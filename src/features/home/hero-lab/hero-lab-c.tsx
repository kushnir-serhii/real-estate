import { BlueprintTrace } from "./blueprint-trace";
import { HeroLabContent } from "./hero-lab-content";
import { HeroLabTrace } from "./hero-lab-trace";
import { TRACE_PHOTO } from "./trace";

/** The photo (the drawing's twin) inside the shared frame; `drift` is the camera move, same on photo and drawing. */
export const TracePhoto = ({ priority = true }: { priority?: boolean }) => (
  // eslint-disable-next-line @next/next/no-img-element -- lab page, static placeholder
  <img
    src={TRACE_PHOTO.src}
    alt=""
    width={TRACE_PHOTO.width}
    height={TRACE_PHOTO.height}
    fetchPriority={priority ? "high" : "low"}
    decoding="async"
    className="absolute inset-0 size-full"
  />
);

/** C: the drawing builds itself on midnight (~3 s), a scan line develops the photo it traces (2.6-5 s), the drawing dims onto the edges. */
export const HeroLabC = () => (
  <>
    <div className="lab-develop absolute inset-0">
      <HeroLabTrace className="lab-drift [--drift-delay:2600ms]">
        <TracePhoto />
      </HeroLabTrace>
    </div>
    <HeroLabTrace className="lab-drift pointer-events-none [--drift-delay:2600ms]">
      <BlueprintTrace />
    </HeroLabTrace>
    <div className="hero-veil absolute inset-0" aria-hidden="true" />
    <div
      className="lab-scan absolute inset-0 border-r border-brand-on-ink motion-reduce:hidden"
      aria-hidden="true"
    />
    <HeroLabContent start={400} />
  </>
);
