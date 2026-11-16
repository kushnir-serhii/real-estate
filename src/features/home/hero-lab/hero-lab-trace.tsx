import { TRACE_PHOTO } from "./trace";

/**
 * One box for the photo and its drawing: both fill the same frame that is "cover"-sized to the stage (container
 * units), so a line stays on its edge at any viewport. `--fx`/`--fy` are the focal point (0-1), the drift is on this box.
 */
export const HeroLabTrace = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`lab-trace absolute inset-0 ${className ?? ""}`}>
    <div
      className="lab-trace-frame"
      style={{ "--ratio": TRACE_PHOTO.width / TRACE_PHOTO.height } as React.CSSProperties}
    >
      {children}
    </div>
  </div>
);
