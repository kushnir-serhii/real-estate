"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type NavLinkProps = {
  href: string;
  activePath: string | null;
  className?: string;
  onNavigate?: () => void;
  children: React.ReactNode;
};

export const NavLink = ({
  href,
  activePath,
  className,
  onNavigate,
  children,
}: NavLinkProps) => {
  const pathname = usePathname();
  // A section is active on its own page and on pages below it (`/blog` on `/blog/<slug>`).
  const active = activePath !== null && (pathname === activePath || pathname.startsWith(`${activePath}/`));

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        // the underline is a 2px bar in the current text colour, growing from the centre
        "relative inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-foreground outline-none transition-colors duration-(--duration-base) on-hero:text-on-scrim focus-visible:ring-3 focus-visible:ring-ring/50",
        "after:absolute after:inset-x-3 after:bottom-2 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-current after:transition-transform after:duration-(--duration-base) after:ease-out-soft hover:after:scale-x-100 focus-visible:after:scale-x-100 motion-reduce:after:transition-none",
        active && "after:scale-x-100",
        className,
      )}
    >
      {children}
    </Link>
  );
};
