import type { Metadata } from "next";

import { SectionHeading } from "@/components/section-heading";
import { EXCLUSIVE, HERO, NEW_PROPERTIES } from "@/constants/home";
import { ExclusiveProperties } from "@/features/home/exclusive-properties";
import { NewProperties } from "@/features/home/new-properties";
import { DistrictPicker } from "@/features/home/district-picker";
import { Districts } from "@/features/home/districts";
import { Hero } from "@/features/home/hero";
import { HomeBlog } from "@/features/home/home-blog";
import { HomeSection } from "@/features/home/home-section";
import { HomeAbout } from "@/features/home/home-about";
import { HomeCta } from "@/features/home/home-cta";
import { Faq } from "@/features/home/faq";
import { Services } from "@/features/home/services";
import { WhyUs } from "@/features/home/why-us";
import { HowWeWork } from "@/features/home/how-we-work";
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
      <Hero title={page.title} lead={HERO.lead}>
        <QuickSearch />
      </Hero>
      <HomeSection labelledBy="exclusive-title">
        <div className="flex flex-col gap-8 lg:gap-12">
          <div className="reveal">
            <SectionHeading
              id="exclusive-title"
              eyebrow={EXCLUSIVE.eyebrow}
              title={EXCLUSIVE.title}
              description={EXCLUSIVE.lead}
              action={EXCLUSIVE.action}
            />
          </div>
          <ExclusiveProperties />
        </div>
      </HomeSection>
      <HomeSection labelledBy="new-title">
        <div className="flex flex-col gap-6">
          <div className="reveal">
            <SectionHeading id="new-title" eyebrow={NEW_PROPERTIES.eyebrow} title={NEW_PROPERTIES.title} />
          </div>
          <NewProperties />
        </div>
      </HomeSection>
      <WhyUs />
      <Services />
      <DistrictPicker />
      <Districts />
      <HowWeWork />
      <HomeAbout body={page.body} />
      <Faq />
      <HomeBlog />
      <HomeCta />
    </>
  );
};

export default HomePage;
