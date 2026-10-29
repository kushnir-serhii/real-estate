import { TriangleAlert } from "lucide-react";
import type { Metadata } from "next";

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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-bold text-balance break-words sm:text-4xl">{page.title}</h1>
      {page.is_draft ? (
        <p
          role="note"
          className="flex items-start gap-3 rounded-lg border border-border bg-muted p-4 text-sm font-medium text-foreground"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Чернетка: текст має перевірити агентство або юрист перед запуском.
        </p>
      ) : null}
      <Markdown>{page.body}</Markdown>
    </div>
  );
};

export default PrivacyPage;
