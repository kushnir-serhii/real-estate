import Link from "next/link";
import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { buttonVariants } from "@/components/ui/button";

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
      <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-6 px-4 py-16 sm:py-24">
        <p className="text-6xl font-bold text-muted-foreground tabular-nums" aria-hidden="true">
          404
        </p>
        <h1 className="text-3xl font-bold text-balance sm:text-4xl">Сторінку не знайдено</h1>
        <p className="max-w-prose text-muted-foreground">
          Можливо, адресу введено з помилкою, або сторінку вже видалено. Поверніться на головну чи
          перегляньте наші пропозиції в каталозі.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className={buttonVariants()}>
            На головну
          </Link>
          <Link href="/catalog" className={buttonVariants({ variant: "outline" })}>
            Перейти до каталогу
          </Link>
        </div>
      </div>
    </main>
    <SiteFooter />
  </div>
);

export default NotFound;
