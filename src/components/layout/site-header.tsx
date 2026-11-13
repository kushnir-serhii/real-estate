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
  NAV_ITEM_CLASS,
  NAV_LINKS,
} from "@/components/layout/nav-config";
import { ThemeToggle } from "@/components/theme-toggle";
import { CONTACTS } from "@/constants/contacts";
import { cn } from "@/lib/utils";

export const SiteHeader = () => (
  <HeaderShell>
    {/* the full desktop header starts at xl: below it the centred nav does not fit next to the logo and the CTA */}
    <div className="site-container flex h-full items-center justify-between gap-2 xl:grid xl:grid-cols-[1fr_auto_1fr]">
      <Logo tone="header" className="justify-self-start" />

      <nav aria-label="Основна навігація" className="hidden xl:block">
        <ul className="flex items-center gap-1">
          {/* the phone is the first nav item, a thin rule separates it from the sections */}
          <li className="flex items-center after:ml-1 after:h-4 after:w-px after:bg-current after:opacity-30">
            <a
              href={CONTACTS.phone.href}
              aria-label={`Подзвонити: ${CONTACTS.phone.display}`}
              className={cn(NAV_ITEM_CLASS, "whitespace-nowrap tabular-nums")}
            >
              {CONTACTS.phone.display}
            </a>
          </li>
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <NavLink href={link.href} activePath={link.activePath}>
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex items-center gap-1 xl:justify-self-end">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className={cn("xl:hidden", HEADER_ICON_CLASS)}
        >
          <a
            href={CONTACTS.phone.href}
            aria-label={`Подзвонити: ${CONTACTS.phone.display}`}
          >
            <Phone />
          </a>
        </Button>
        <FavoritesLink className={HEADER_ICON_CLASS} />
        <ThemeToggle className={cn("hidden xl:inline-flex", HEADER_ICON_CLASS)} />
        <Button asChild variant="dawn" className="ml-2 hidden xl:inline-flex">
          <Link href={CTA_LINK.href}>
            {CTA_LINK.label}
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>
        <div className="xl:hidden">
          <MobileMenu />
        </div>
      </div>
    </div>
  </HeaderShell>
);
