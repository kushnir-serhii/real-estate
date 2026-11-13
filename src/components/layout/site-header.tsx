import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FavoritesLink } from "@/components/layout/favorites-link";
import { HeaderShell } from "@/components/layout/header-shell";
import { Logo } from "@/components/layout/logo";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { NavLink } from "@/components/layout/nav-link";
import {
  CTA_LINK,
  HEADER_ICON_CLASS,
  NAV_LINKS,
} from "@/components/layout/nav-config";
import { ThemeToggle } from "@/components/theme-toggle";
import { CONTACTS } from "@/constants/contacts";
import { cn } from "@/lib/utils";

export const SiteHeader = () => (
  <HeaderShell>
    <div className="site-container flex h-full items-center justify-between gap-2 lg:grid lg:grid-cols-[1fr_auto_1fr]">
      <Logo tone="header" className="justify-self-start" />

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

      <div className="flex items-center gap-1 lg:justify-self-end">
        {/* number from 2xl (it does not fit next to a centred nav before), icon-only with a label below */}
        <a
          href={CONTACTS.phone.href}
          aria-label={`Подзвонити: ${CONTACTS.phone.display}`}
          className="hidden min-h-11 items-center gap-2 rounded-md px-2 text-sm font-semibold whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50 2xl:inline-flex"
        >
          <Phone className="size-4" aria-hidden="true" />
          <span className="tabular-nums">{CONTACTS.phone.display}</span>
        </a>
        <Button
          asChild
          variant="ghost"
          size="icon"
          className={cn("2xl:hidden", HEADER_ICON_CLASS)}
        >
          <a
            href={CONTACTS.phone.href}
            aria-label={`Подзвонити: ${CONTACTS.phone.display}`}
          >
            <Phone />
          </a>
        </Button>
        <FavoritesLink className={HEADER_ICON_CLASS} />
        <ThemeToggle className={cn("hidden lg:inline-flex", HEADER_ICON_CLASS)} />
        <Button asChild variant="dawn" className="ml-2 hidden lg:inline-flex">
          <Link href={CTA_LINK.href}>
            {CTA_LINK.label}
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>
        <div className="lg:hidden">
          <MobileMenu />
        </div>
      </div>
    </div>
  </HeaderShell>
);
