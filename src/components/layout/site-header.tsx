import Link from "next/link";
import { Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { NavLink } from "@/components/layout/nav-link";
import { CTA_LINK, NAV_LINKS } from "@/components/layout/nav-config";
import { ThemeToggle } from "@/components/theme-toggle";
import { SITE_CONFIG } from "@/lib/site-config";

export const SiteHeader = () => (
  <header className="sticky top-0 z-40 border-b bg-background">
    <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4">
      <Logo />

      <nav aria-label="Основна навігація" className="hidden lg:block">
        <ul className="flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <NavLink href={link.href} activePath={link.activePath}>
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="hidden items-center gap-3 lg:flex">
        <a
          href={SITE_CONFIG.phone.href}
          className="inline-flex min-h-11 items-center gap-2 rounded-md px-1 text-sm font-semibold text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Phone className="size-4" aria-hidden="true" />
          <span className="tabular-nums">{SITE_CONFIG.phone.display}</span>
        </a>
        <ThemeToggle />
        <Button asChild>
          <Link href={CTA_LINK.href}>{CTA_LINK.label}</Link>
        </Button>
      </div>

      <div className="flex items-center gap-1 lg:hidden">
        <Button asChild variant="ghost" size="icon">
          <a
            href={SITE_CONFIG.phone.href}
            aria-label={`Подзвонити: ${SITE_CONFIG.phone.display}`}
          >
            <Phone />
          </a>
        </Button>
        <MobileMenu />
      </div>
    </div>
  </header>
);
