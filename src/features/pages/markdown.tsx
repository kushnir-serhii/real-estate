import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

import { cn } from "@/lib/utils";

type MarkdownProps = { children: string; className?: string };

const COMPONENTS: Components = {
  h2: ({ children }) => (
    <h2 className="mt-10 mb-4 font-heading text-xl leading-snug font-semibold tracking-tight text-foreground first:mt-0 sm:text-2xl">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-8 mb-3 font-heading text-base leading-snug font-semibold tracking-tight text-foreground sm:text-lg">{children}</h3>
  ),
  p: ({ children }) => <p className="mb-4 leading-7 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-4 list-disc space-y-2 pl-6 marker:text-dawn-text">{children}</ul>,
  li: ({ children }) => <li className="leading-7">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="font-medium text-foreground underline decoration-dawn decoration-2 underline-offset-4 outline-none hover:text-dawn-text focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {children}
    </a>
  ),
};

/** Renders Markdown with token-based typography. Raw HTML is not rendered. */
export const Markdown = ({ children, className }: MarkdownProps) => (
  <div className={cn("max-w-prose text-base text-muted-foreground", className)}>
    <ReactMarkdown components={COMPONENTS}>{children}</ReactMarkdown>
  </div>
);
