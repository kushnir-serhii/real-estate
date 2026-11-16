import { HERO } from "@/constants/home";

/**
 * One box for the photo and its drawing: both fill the same frame that is "cover"-sized to the hero (container
 * units), so a line stays on its edge at any viewport. `--fx`/`--fy` are the focal point (0-1); the drift is on this box.
 */
export const HeroTraceFrame = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`hero-trace absolute inset-0 ${className ?? ""}`}>
    <div
      className="hero-trace-frame"
      style={{ "--ratio": HERO.image.width / HERO.image.height } as React.CSSProperties}
    >
      {children}
    </div>
  </div>
);
