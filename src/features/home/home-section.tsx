import { cn } from "@/lib/utils";

type HomeSectionProps = {
  /** Id of the section's h2. */
  labelledBy?: string;
  ariaLabel?: string;
  /** `ink`: full-bleed midnight surface. */
  tone?: "default" | "ink";
  className?: string;
  children: React.ReactNode;
};

/** Shared home section: one vertical rhythm and one content width. */
export const HomeSection = ({ labelledBy, ariaLabel, tone = "default", className, children }: HomeSectionProps) => (
  <section
    aria-labelledby={labelledBy}
    aria-label={labelledBy ? undefined : ariaLabel}
    className={cn("py-16 sm:py-24", tone === "ink" && "bg-ink text-on-ink", className)}
  >
    <div className="mx-auto w-full max-w-6xl px-4">{children}</div>
  </section>
);
