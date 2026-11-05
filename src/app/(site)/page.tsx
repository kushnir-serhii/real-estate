import { Suspense } from "react";
import type { Metadata } from "next";

import { SectionHeading } from "@/components/section-heading";
import { FEATURED, HERO } from "@/constants/home";
import { FeaturedProperties } from "@/features/home/featured-properties";
import { FeaturedSkeleton } from "@/features/home/featured-skeleton";
import { Hero } from "@/features/home/hero";
import { HomeAbout } from "@/features/home/home-about";
import { HomeCta } from "@/features/home/home-cta";
import { QuickSearch } from "@/features/home/quick-search";
import { getPageContent } from "@/features/pages/get-page-content";
import { pageSeoDescription, pageSeoTitle } from "@/features/pages/page-seo";

export const revalidate = 300;

export const generateMetadata = async (): Promise<Metadata> => {
  const page = await getPageContent("home");
  return {
    title: pageSeoTitle(page),
    description: pageSeoDescription(page),
    alternates: { canonical: "/" },
    robots: page.noindex ? { index: false, follow: true } : undefined,
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
          <SectionHeading
            id="featured-title"
            eyebrow={FEATURED.eyebrow}
            title={FEATURED.title}
            action={{ href: "/catalog", label: FEATURED.action }}
          />
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
