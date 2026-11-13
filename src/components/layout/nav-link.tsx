"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEM_CLASS } from "@/components/layout/nav-config";
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
        NAV_ITEM_CLASS,
        active && "after:scale-x-100",
        className,
      )}
    >
      {children}
    </Link>
  );
};
