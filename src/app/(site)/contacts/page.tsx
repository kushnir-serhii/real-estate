import { Suspense } from "react";
import type { Metadata } from "next";

import { AgentsSection } from "@/features/contacts/agents-section";
import { AgentsSkeleton } from "@/features/contacts/agents-skeleton";
import { ContactBlock } from "@/features/contacts/contact-block";
import { GeneralRequestForm } from "@/features/leads/general-request-form";
import { MapEmbed } from "@/features/contacts/map-embed";
import { Markdown } from "@/features/pages/markdown";
import { getPageContent } from "@/features/pages/get-page-content";

export const revalidate = 300;

export const generateMetadata = async (): Promise<Metadata> => {
  const page = await getPageContent("contacts");
  return {
    title: page.seo_title ?? page.title,
    description: page.seo_description ?? undefined,
    alternates: { canonical: "/contacts" },
  };
};

const ContactsPage = async () => {
  const page = await getPageContent("contacts");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:gap-12 sm:py-12">
      <div className="flex max-w-3xl flex-col gap-6">
        <h1 className="text-3xl font-bold text-balance break-words sm:text-4xl">{page.title}</h1>
        <Markdown>{page.body}</Markdown>
      </div>
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
        <ContactBlock />
        <section
          id="zayavka"
          className="scroll-mt-24 rounded-xl bg-card p-5 text-card-foreground ring-1 ring-foreground/10 sm:p-8"
        >
          <GeneralRequestForm
            title="Залишити заявку"
            description="Напишіть, що шукаєте: купити чи орендувати, який тип, побажання. Підберемо варіанти й зателефонуємо."
          />
        </section>
      </div>
      <Suspense fallback={<AgentsSkeleton />}>
        <AgentsSection />
      </Suspense>
      <MapEmbed />
    </div>
  );
};

export default ContactsPage;
