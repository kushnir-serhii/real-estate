import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

import { cn } from "@/lib/utils";

type MarkdownProps = { children: string; className?: string };

const COMPONENTS: Components = {
  h2: ({ children }) => (
    <h2 className="mt-6 mb-3 text-2xl font-bold text-foreground first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-5 mb-2 text-lg font-semibold text-foreground">{children}</h3>
  ),
  p: ({ children }) => <p className="mb-4 leading-relaxed last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-4 list-disc space-y-1 pl-6">{children}</ul>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-primary underline underline-offset-4 outline-none hover:no-underline focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {children}
    </a>
  ),
};

/** Renders Markdown with token-based typography. Raw HTML is not rendered. */
export const Markdown = ({ children, className }: MarkdownProps) => (
  <div className={cn("text-base text-muted-foreground", className)}>
    <ReactMarkdown components={COMPONENTS}>{children}</ReactMarkdown>
  </div>
);
