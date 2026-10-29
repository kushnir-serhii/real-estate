import { ExternalLink as ExternalLinkIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type ExternalLinkProps = {
  href: string;
  children: React.ReactNode;
  /** Full value for a truncated text. */
  title?: string;
  /** One line with an ellipsis (URLs) instead of wrapping (titles). */
  truncate?: boolean;
  className?: string;
};

/** Opens in a new tab; says so to screen readers. Inline text link, at least 44px tall to tap. */
export const ExternalLink = ({ href, children, title, truncate = false, className }: ExternalLinkProps) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    title={title}
    className={cn(
      "inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50",
      className,
    )}
  >
    <span className={cn("min-w-0", truncate ? "truncate" : "wrap-anywhere")}>{children}</span>
    <ExternalLinkIcon className="size-4 shrink-0" aria-hidden="true" />
    <span className="sr-only">(відкриється в новій вкладці)</span>
  </a>
);
