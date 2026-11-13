import Link from "next/link";

import { cn } from "@/lib/utils";
import { BRAND } from "@/constants/brand";
import { ShieldMark } from "@/components/layout/shield-mark";

type LogoProps = {
  className?: string;
  /** `full`: shield + rule + «DIPLOMAT / HALL». `mark`: the shield only (compact places). */
  variant?: "full" | "mark";
  /** `header`: light over the hero while the header is transparent. `on-ink`: for dark surfaces. */
  tone?: "default" | "header" | "on-ink";
  /** `sm` admin, `md` site header, `lg` footer. */
  size?: "sm" | "md" | "lg";
  /** Keep the name on very narrow screens too (by default only the shield shows below 360px). */
  alwaysShowName?: boolean;
  /** Called when the link is clicked (e.g. to close the mobile menu). */
  onNavigate?: () => void;
};

// Monochrome: shield, rule and wordmark all follow the text colour.
const TONE = {
  default: "text-foreground",
  header: "text-foreground on-hero:text-on-scrim",
  "on-ink": "text-on-ink",
} as const;

const SIZE = { sm: "logo-sm", md: "logo-md", lg: "logo-lg" } as const;

export const Logo = ({
  className,
  variant = "full",
  tone = "default",
  size = "md",
  alwaysShowName = false,
  onNavigate,
}: LogoProps) => {
  const nameClass = cn(!alwaysShowName && "max-[360px]:hidden");

  return (
    <Link
      href="/"
      aria-label={`${BRAND.name}: на головну`}
      onClick={onNavigate}
      className={cn(
        "logo-lockup min-h-11 shrink-0 rounded-md outline-none transition-colors duration-(--duration-base) focus-visible:ring-3 focus-visible:ring-ring/50",
        SIZE[size],
        TONE[tone],
        className,
      )}
    >
      <ShieldMark className="logo-shield" />
      {variant === "full" ? (
        <>
          <span aria-hidden="true" className={cn("logo-rule", nameClass)} />
          <span aria-hidden="true" className={cn("logo-wordmark flex flex-col", nameClass)}>
            <span>DIPLOMAT</span>
            <span>HALL</span>
          </span>
        </>
      ) : null}
    </Link>
  );
};
