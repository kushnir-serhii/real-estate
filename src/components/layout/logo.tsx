import Link from "next/link";

import { cn } from "@/lib/utils";
import { BRAND } from "@/constants/brand";

type LogoProps = { className?: string };

// Text wordmark: placeholder until the brand exists.
export const Logo = ({ className }: LogoProps) => (
  <Link
    href="/"
    aria-label={`${BRAND.name}: на головну`}
    className={cn(
      "inline-flex min-h-11 items-center rounded-md text-xl font-bold tracking-tight text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
      className,
    )}
  >
    {BRAND.name}
  </Link>
);
