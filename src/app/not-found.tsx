import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { NOT_FOUND_PAGE } from "@/constants/inner-pages";

export const metadata: Metadata = {
  title: "Сторінку не знайдено",
  robots: { index: false },
};

const NotFound = () => (
  <div className="flex min-h-dvh flex-col">
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-3 focus:text-primary-foreground"
    >
      Перейти до змісту
    </a>
    <SiteHeader />
    <main id="main" className="flex-1">
      <div className="mx-auto w-full max-w-3xl px-4 pt-8 sm:pt-16">
        <p
          aria-hidden="true"
          className="font-heading text-[clamp(5rem,3rem+10vw,9rem)] leading-none font-semibold tracking-tighter text-dawn tabular-nums"
        >
          {NOT_FOUND_PAGE.code}
        </p>
      </div>
      <PageHeader width="narrow" eyebrow={NOT_FOUND_PAGE.eyebrow} title={NOT_FOUND_PAGE.title} lead={NOT_FOUND_PAGE.lead} className="pt-4 pb-16 sm:pt-6 sm:pb-24">
        <Link href="/" className={buttonVariants({ variant: "dawn", size: "lg" })}>
          {NOT_FOUND_PAGE.home}
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Link>
        <Link href="/catalog" className={buttonVariants({ variant: "outline", size: "lg" })}>
          {NOT_FOUND_PAGE.catalog}
        </Link>
      </PageHeader>
    </main>
    <SiteFooter />
  </div>
);

export default NotFound;
