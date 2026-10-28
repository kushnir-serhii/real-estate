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
  const active = activePath !== null && pathname === activePath;

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
        active && "bg-accent text-accent-foreground",
        className,
      )}
    >
      {children}
    </Link>
  );
};
