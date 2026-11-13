import type { Metadata } from "next";

import { SectionHeading } from "@/components/section-heading";
import { FEATURED, HERO } from "@/constants/home";
import { FeaturedProperties } from "@/features/home/featured-properties";
import { Districts } from "@/features/home/districts";
import { Hero } from "@/features/home/hero";
import { HomeAgents } from "@/features/home/home-agents";
import { HomeBlog } from "@/features/home/home-blog";
import { Testimonials } from "@/features/home/testimonials";
import { HomeSection } from "@/features/home/home-section";
import { HomeAbout } from "@/features/home/home-about";
import { HomeCta } from "@/features/home/home-cta";
import { HowWeWork } from "@/features/home/how-we-work";
import { ProptechFeatures } from "@/features/home/proptech-features";
import { QuickSearch } from "@/features/home/quick-search";
import { TrustStats } from "@/features/home/trust-stats";
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
      <div className="site-container">
        <div className="relative -mt-16">
          <QuickSearch />
        </div>
      </div>
      <TrustStats />
      <HomeSection labelledBy="featured-title" className="pt-4 sm:pt-8 lg:pt-8">
        <div className="flex flex-col gap-6">
          <div className="reveal">
            <SectionHeading
              id="featured-title"
              eyebrow={FEATURED.eyebrow}
              title={FEATURED.title}
              action={{ href: "/catalog", label: FEATURED.action }}
            />
          </div>
          <FeaturedProperties />
        </div>
      </HomeSection>
      <Districts />
      <HowWeWork />
      <ProptechFeatures />
      <HomeAbout body={page.body} />
      <HomeAgents />
      <HomeBlog />
      <Testimonials />
      <HomeCta />
    </>
  );
};

export default HomePage;
