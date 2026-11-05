"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MessengerLinks } from "@/components/layout/messenger-links";
import { NavLink } from "@/components/layout/nav-link";
import {
  CTA_LINK,
  HEADER_ICON_CLASS,
  NAV_LINKS,
} from "@/components/layout/nav-config";
import { ThemeToggle } from "@/components/theme-toggle";
import { CONTACTS } from "@/constants/contacts";

export const MobileMenu = () => {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Відкрити меню"
          className={HEADER_ICON_CLASS}
        >
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="gap-6 overflow-y-auto data-[side=right]:w-full"
      >
        <SheetHeader>
          <SheetTitle className="eyebrow text-muted-foreground">Меню</SheetTitle>
          <SheetDescription className="sr-only">
            Навігація по сайту та контакти
          </SheetDescription>
        </SheetHeader>
        <nav aria-label="Основна навігація" className="px-4">
          <ul className="flex flex-col gap-2">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <NavLink
                  href={link.href}
                  activePath={link.activePath}
                  onNavigate={close}
                  className="min-h-14 px-0 font-heading text-2xl font-medium tracking-tight after:inset-x-0 after:bottom-2"
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-col gap-4 px-4">
          <Button asChild variant="dawn" size="lg">
            <Link href={CTA_LINK.href} onClick={close}>
              {CTA_LINK.label}
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
          <a
            href={CONTACTS.phone.href}
            className="inline-flex min-h-11 items-center gap-2 rounded-md text-base font-semibold text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Phone className="size-4" aria-hidden="true" />
            <span className="tabular-nums">{CONTACTS.phone.display}</span>
          </a>
          <MessengerLinks />
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 border-t p-4">
          <span className="text-sm text-muted-foreground">Тема оформлення</span>
          <ThemeToggle />
        </div>
      </SheetContent>
    </Sheet>
  );
};
