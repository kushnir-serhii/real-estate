"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type AdminNavLinkProps = { href: string; children: React.ReactNode };

/** Active on the section itself and on anything inside it (`/admin/leads/…`). */
export const AdminNavLink = ({ href, children }: AdminNavLinkProps) => {
  const pathname = usePathname();
  const exact = pathname === href;
  const inside = exact || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={exact ? "page" : inside ? "true" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
        inside && "bg-accent text-accent-foreground hover:bg-accent",
      )}
    >
      {children}
    </Link>
  );
};
