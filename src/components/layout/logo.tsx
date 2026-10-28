import Link from "next/link";

import { cn } from "@/lib/utils";
import { SITE_CONFIG } from "@/lib/site-config";

type LogoProps = { className?: string };

// Text wordmark: placeholder until the brand exists.
export const Logo = ({ className }: LogoProps) => (
  <Link
    href="/"
    aria-label={`${SITE_CONFIG.name}: на головну`}
    className={cn(
      "inline-flex min-h-11 items-center rounded-md text-xl font-bold tracking-tight text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
      className,
    )}
  >
    {SITE_CONFIG.name}
  </Link>
);
