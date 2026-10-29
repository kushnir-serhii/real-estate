import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { MessengerLinks } from "@/components/layout/messenger-links";
import { PlektanButton } from "@/components/layout/plektan-button";
import { BRAND } from "@/constants/brand";
import { CONTACTS } from "@/constants/contacts";

const LINK_CLASS =
  "inline-flex min-h-11 items-center gap-2 rounded-md text-sm text-foreground outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50";

export const SiteFooter = () => {
  const socials = Object.values(CONTACTS.socials).filter(
    (item) => item.url !== "",
  );

  return (
    <footer className="border-t bg-muted">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 md:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col items-start gap-2">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            {BRAND.tagline}
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold">Контакти</h2>
          <ul className="flex flex-col">
            <li>
              <a href={CONTACTS.phone.href} className={LINK_CLASS}>
                <Phone className="size-4 shrink-0" aria-hidden="true" />
                <span className="tabular-nums">{CONTACTS.phone.display}</span>
              </a>
            </li>
            <li>
              <a href={`mailto:${CONTACTS.email}`} className={LINK_CLASS}>
                <Mail className="size-4 shrink-0" aria-hidden="true" />
                <span className="break-all">{CONTACTS.email}</span>
              </a>
            </li>
            <li className="flex min-h-11 items-center gap-2 text-sm">
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              {CONTACTS.address}
            </li>
            <li className="flex min-h-11 items-center gap-2 text-sm">
              <Clock className="size-4 shrink-0" aria-hidden="true" />
              {CONTACTS.hours}
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Напишіть нам</h2>
          <MessengerLinks />
          {socials.length > 0 && (
            <ul className="flex flex-wrap gap-x-4">
              {socials.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener"
                    className={LINK_CLASS}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 pt-4 pb-chat-launcher sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {BRAND.name}
          </p>
          <Link href="/privacy" className={LINK_CLASS}>
            Політика конфіденційності
          </Link>
          <PlektanButton />
        </div>
      </div>
    </footer>
  );
};
