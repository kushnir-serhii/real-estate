import Link from "next/link";

import { cn } from "@/lib/utils";
import { BRAND } from "@/constants/brand";
import { LogoMark } from "@/components/layout/logo-mark";

type LogoProps = {
  className?: string;
  /** Keep the wordmark on very narrow screens too (by default only the mark shows below 360px). */
  alwaysShowName?: boolean;
};

export const Logo = ({ className, alwaysShowName = false }: LogoProps) => (
  <Link
    href="/"
    aria-label={`${BRAND.name}: на головну`}
    className={cn(
      "inline-flex min-h-11 items-center gap-2 rounded-md text-xl font-bold tracking-tight text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
      className,
    )}
  >
    <LogoMark className="text-primary" />
    <span aria-hidden="true" className={cn("whitespace-nowrap", !alwaysShowName && "max-[359px]:hidden")}>
      {BRAND.name}
    </span>
  </Link>
);
