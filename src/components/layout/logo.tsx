import Link from "next/link";

import { cn } from "@/lib/utils";
import { BRAND } from "@/constants/brand";
import { LogoMark } from "@/components/layout/logo-mark";

type LogoProps = {
  className?: string;
  /** `header`: light over the hero while the header is transparent. `on-ink`: for dark surfaces (mark in dawn). */
  tone?: "default" | "header" | "on-ink";
  /** Keep the wordmark on very narrow screens too (by default only the mark shows below 360px). */
  alwaysShowName?: boolean;
};

const TEXT = {
  default: "text-foreground",
  header: "text-foreground on-hero:text-on-scrim",
  "on-ink": "text-on-ink",
} as const;

const MARK = {
  default: "text-primary",
  header: "text-primary on-hero:text-on-scrim",
  "on-ink": "text-dawn",
} as const;

export const Logo = ({ className, tone = "default", alwaysShowName = false }: LogoProps) => (
  <Link
    href="/"
    aria-label={`${BRAND.name}: на головну`}
    className={cn(
      "inline-flex min-h-11 items-center gap-2 rounded-md text-xl font-bold tracking-tight outline-none transition-colors duration-(--duration-base) focus-visible:ring-3 focus-visible:ring-ring/50",
      TEXT[tone],
      className,
    )}
  >
    <LogoMark className={cn("transition-colors duration-(--duration-base)", MARK[tone])} />
    <span aria-hidden="true" className={cn("whitespace-nowrap", !alwaysShowName && "max-[359px]:hidden")}>
      {BRAND.name}
    </span>
  </Link>
);
