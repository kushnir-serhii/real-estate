import { cn } from "@/lib/utils";

type LogoMarkProps = { className?: string };

/**
 * The 7 SKY mark, inline so it follows `currentColor` (the theme). Same geometry as
 * `public/brand/7sky-mark.svg`: keep the two in sync. Decorative: the link around it carries the name.
 */
export const LogoMark = ({ className }: LogoMarkProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="4 6 112 66"
    fill="none"
    stroke="currentColor"
    strokeWidth={4}
    strokeLinejoin="miter"
    strokeLinecap="butt"
    aria-hidden="true"
    focusable="false"
    className={cn("h-8 w-auto shrink-0", className)}
  >
    <path d="M40 68H24A15.5 15.5 0 0 1 26 38A30 30 0 0 1 84 30A20.5 20.5 0 0 1 96 68H76" />
    <path d="M40 70V54L48 50" />
    <path d="M48 70V30L66 20V44" />
    <path d="M58 70V40L76 49V70" />
    <path d="M53 70V33M64 70V43M70 70V46" />
  </svg>
);
