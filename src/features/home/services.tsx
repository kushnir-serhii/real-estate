import { Briefcase, Building2, Calculator, Home, Key, ShieldCheck, Tag } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { SectionHeading } from "@/components/section-heading";
import { SERVICES } from "@/constants/home";
import { HomeSection } from "./home-section";

const ICONS: Record<(typeof SERVICES.items)[number]["key"], LucideIcon> = {
  buy: Home,
  sell: Tag,
  rent: Key,
  commercial: Building2,
  legal: ShieldCheck,
  valuation: Calculator,
};

/** Six services as whole-tile links, divided by hairlines. */
export const Services = () => (
  <HomeSection labelledBy="services-title" className="bg-muted/40">
    <div className="flex flex-col gap-8 lg:gap-12">
      <div className="reveal">
        <SectionHeading id="services-title" eyebrow={SERVICES.eyebrow} title={SERVICES.title} />
      </div>
      <ul className="reveal-stagger grid border-t border-l border-border sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.items.map((item) => {
          const Icon = ICONS[item.key] ?? Briefcase;
          return (
            <li key={item.key} className="border-r border-b border-border">
              <Link
                href={item.href}
                className="group/service flex min-h-11 h-full gap-4 p-5 outline-none transition-colors duration-(--duration-fast) hover:bg-background focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring sm:p-6"
              >
                <Icon className="mt-0.5 size-6 shrink-0 text-brand-text" aria-hidden="true" />
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-lg font-semibold break-words group-hover/service:text-brand-text">{item.title}</span>
                  <span className="text-muted-foreground">{item.text}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  </HomeSection>
);
