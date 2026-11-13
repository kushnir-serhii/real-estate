import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { ABOUT_PAGE } from "@/constants/inner-pages";
import { AboutTeam } from "@/features/about/about-team";
import { Markdown } from "@/features/pages/markdown";
import { getPageContent } from "@/features/pages/get-page-content";
import { pageSeoDescription, pageSeoTitle } from "@/features/pages/page-seo";

export const revalidate = 300;

export const generateMetadata = async (): Promise<Metadata> => {
  const page = await getPageContent("about");
  return {
    title: pageSeoTitle(page),
    description: pageSeoDescription(page),
    alternates: { canonical: "/about" },
    robots: page.noindex ? { index: false, follow: true } : undefined,
  };
};

const AboutPage = async () => {
  const page = await getPageContent("about");

  return (
    <div className="pb-16 sm:pb-24">
      <PageHeader width="narrow" eyebrow={ABOUT_PAGE.eyebrow} title={page.title} lead={ABOUT_PAGE.lead} />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 sm:px-6">
        <Markdown>{page.body}</Markdown>
      </div>
      <div className="mt-10 sm:mt-14">
        <AboutTeam />
      </div>
      <div className="mx-auto mt-10 flex w-full max-w-3xl flex-wrap gap-3 px-4 sm:px-6">
        <Link href="/contacts" className={buttonVariants({ variant: "dawn", size: "lg" })}>
          {ABOUT_PAGE.contactAction}
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Link>
        <Link href="/catalog" className={buttonVariants({ variant: "outline", size: "lg" })}>
          {ABOUT_PAGE.catalogAction}
        </Link>
      </div>
    </div>
  );
};

export default AboutPage;
