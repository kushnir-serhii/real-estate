import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  /** Id of the h2, for the section's `aria-labelledby`. */
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
  /** `ink` when placed on the midnight surface. */
  tone?: "default" | "ink";
};

export const SectionHeading = ({ id, eyebrow, title, description, action, tone = "default" }: SectionHeadingProps) => (
  <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
    <div className="flex min-w-0 flex-col gap-2">
      {eyebrow && <p className={cn("eyebrow", tone === "ink" ? "text-dawn" : "text-dawn-text")}>{eyebrow}</p>}
      <h2 id={id} className="text-h2">
        {title}
      </h2>
      {description && <p className={cn("max-w-prose", tone === "ink" ? "text-ink-muted" : "text-muted-foreground")}>{description}</p>}
    </div>
    {action && (
      <Link
        href={action.href}
        className="group/action inline-flex min-h-11 items-center gap-2 font-medium text-foreground outline-none hover:text-dawn-text focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {action.label}
        <ArrowRight
          className="size-4 transition-transform duration-(--duration-base) ease-(--ease-out-soft) group-hover/action:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover/action:translate-x-0"
          aria-hidden="true"
        />
      </Link>
    )}
  </div>
);
