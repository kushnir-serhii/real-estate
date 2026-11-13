import { TriangleAlert } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { PRIVACY_PAGE } from "@/constants/inner-pages";
import { Markdown } from "@/features/pages/markdown";
import { getPageContent } from "@/features/pages/get-page-content";
import { pageSeoDescription, pageSeoTitle } from "@/features/pages/page-seo";

export const revalidate = 300;

export const generateMetadata = async (): Promise<Metadata> => {
  const page = await getPageContent("privacy");
  return {
    title: pageSeoTitle(page),
    description: pageSeoDescription(page),
    alternates: { canonical: "/privacy" },
    robots: page.noindex ? { index: false, follow: true } : undefined,
  };
};

const PrivacyPage = async () => {
  const page = await getPageContent("privacy");

  return (
    <div className="pb-16 sm:pb-24">
      <PageHeader width="narrow" eyebrow={PRIVACY_PAGE.eyebrow} title={page.title} />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 sm:px-6">
        {page.is_draft ? (
          <p
            role="note"
            className="flex items-start gap-3 rounded-2xl border border-border bg-muted p-4 text-sm font-medium text-foreground"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-dawn-text" aria-hidden="true" />
            {PRIVACY_PAGE.draftNote}
          </p>
        ) : null}
        <Markdown>{page.body}</Markdown>
      </div>
    </div>
  );
};

export default PrivacyPage;
