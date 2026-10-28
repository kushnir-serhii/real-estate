import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";

import { HERO } from "@/constants/home";
import { FeaturedProperties } from "@/features/home/featured-properties";
import { FeaturedSkeleton } from "@/features/home/featured-skeleton";
import { Hero } from "@/features/home/hero";
import { HomeAbout } from "@/features/home/home-about";
import { HomeCta } from "@/features/home/home-cta";
import { QuickSearch } from "@/features/home/quick-search";
import { getPageContent } from "@/features/pages/get-page-content";

export const revalidate = 300;

export const generateMetadata = async (): Promise<Metadata> => {
  const page = await getPageContent("home");
  return {
    title: { absolute: page.seo_title ?? page.title },
    description: page.seo_description ?? undefined,
    alternates: { canonical: "/" },
  };
};

const HomePage = async () => {
  const page = await getPageContent("home");

  return (
    <>
      <Hero title={page.title} lead={HERO.lead} />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 pb-12 sm:gap-16 sm:pb-16">
        <div className="relative -mt-16">
          <QuickSearch />
        </div>
        <section aria-labelledby="featured-title" className="flex flex-col gap-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="featured-title" className="text-2xl font-bold">
              Нові пропозиції
            </h2>
            <Link
              href="/catalog"
              className="inline-flex min-h-11 items-center text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Усі об&apos;єкти
            </Link>
          </div>
          <Suspense fallback={<FeaturedSkeleton />}>
            <FeaturedProperties />
          </Suspense>
        </section>
        <HomeAbout body={page.body} />
        <HomeCta />
      </div>
    </>
  );
};

export default HomePage;
