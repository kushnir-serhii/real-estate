import Link from "next/link";
import { ArrowRight, Clock, Mail, MapPin, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { MessengerLinks } from "@/components/layout/messenger-links";
import { CTA_LINK, NAV_LINKS } from "@/components/layout/nav-config";
import { PlektanButton } from "@/components/layout/plektan-button";
import { BRAND } from "@/constants/brand";
import { CONTACTS } from "@/constants/contacts";
import { FOOTER } from "@/constants/footer";
import { isDemoMode } from "@/lib/data-driver";

const LINK_CLASS =
  "inline-flex min-h-11 items-center gap-2 rounded-md text-sm text-ink-muted outline-none transition-colors duration-(--duration-base) hover:text-on-ink focus-visible:ring-3 focus-visible:ring-dawn/60";
const ROW_CLASS = "flex min-h-11 items-center gap-2 text-sm text-ink-muted";
const HEADING_CLASS = "eyebrow mb-2 text-on-ink";

export const SiteFooter = () => {
  const socials = Object.values(CONTACTS.socials).filter(
    (item) => item.url !== "",
  );

  return (
    <footer className="bg-ink text-on-ink">
      <div className="site-container">
        <div className="flex flex-col gap-6 border-b border-ink-border py-12 sm:py-16 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow mb-3 text-dawn">{FOOTER.cta.eyebrow}</p>
            <h2 className="text-h1 text-on-ink">{FOOTER.cta.title}</h2>
            <p className="mt-3 max-w-xl text-base text-pretty text-ink-muted">
              {FOOTER.cta.lead}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
            <Button asChild variant="dawn" size="lg">
              <Link href={CTA_LINK.href}>
                {CTA_LINK.label}
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Link>
            </Button>
            <a
              href={CONTACTS.phone.href}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-ink-border px-5 text-base font-medium text-on-ink outline-none transition-colors duration-(--duration-base) hover:bg-on-ink/10 focus-visible:ring-3 focus-visible:ring-dawn/60"
            >
              <Phone className="size-4" aria-hidden="true" />
              <span className="tabular-nums">{CONTACTS.phone.display}</span>
            </a>
          </div>
        </div>

        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.2fr_1fr]">
          <div className="flex flex-col items-start gap-3">
            <Logo tone="on-ink" alwaysShowName />
            <p className="max-w-xs text-sm text-pretty text-ink-muted">
              {BRAND.tagline}
            </p>
          </div>

          <nav aria-label="Навігація у підвалі">
            <h2 className={HEADING_CLASS}>Навігація</h2>
            <ul className="flex flex-col">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={LINK_CLASS}>
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/favorites" className={LINK_CLASS}>
                  Обране
                </Link>
              </li>
              <li>
                <Link href="/privacy" className={LINK_CLASS}>
                  Політика конфіденційності
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <h2 className={HEADING_CLASS}>Контакти</h2>
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
              <li className={ROW_CLASS}>
                <MapPin className="size-4 shrink-0" aria-hidden="true" />
                {CONTACTS.address}
              </li>
              <li className={ROW_CLASS}>
                <Clock className="size-4 shrink-0" aria-hidden="true" />
                {CONTACTS.hours}
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className={`${HEADING_CLASS} mb-0`}>Напишіть нам</h2>
            <MessengerLinks tone="ink" />
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

        <div className="flex flex-col gap-2 border-t border-ink-border pt-4 pb-chat-launcher sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-muted">
            © {new Date().getFullYear()} {BRAND.name}
          </p>
          {isDemoMode() ? (
            <p className="text-xs text-ink-muted">{FOOTER.demoNote}</p>
          ) : null}
          <Link href="/privacy" className={LINK_CLASS}>
            Політика конфіденційності
          </Link>
          <PlektanButton />
        </div>
      </div>
    </footer>
  );
};
