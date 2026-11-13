import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { CONTACTS } from "@/constants/contacts";
import { CONTACTS_PAGE } from "@/constants/inner-pages";
import { AgentsSection } from "@/features/contacts/agents-section";
import { ContactBlock } from "@/features/contacts/contact-block";
import { StaticMap } from "@/features/map/static-map";
import { GeneralRequestForm } from "@/features/leads/general-request-form";
import { Markdown } from "@/features/pages/markdown";
import { getPageContent } from "@/features/pages/get-page-content";
import { pageSeoDescription, pageSeoTitle } from "@/features/pages/page-seo";

export const revalidate = 300;

export const generateMetadata = async (): Promise<Metadata> => {
  const page = await getPageContent("contacts");
  return {
    title: pageSeoTitle(page),
    description: pageSeoDescription(page),
    alternates: { canonical: "/contacts" },
    robots: page.noindex ? { index: false, follow: true } : undefined,
  };
};

const ContactsPage = async () => {
  const page = await getPageContent("contacts");

  return (
    <div className="pb-16 sm:pb-24">
      <PageHeader eyebrow={CONTACTS_PAGE.eyebrow} title={page.title} />
      <div className="site-container flex flex-col gap-14 sm:gap-20">
        <Markdown className="max-w-prose">{page.body}</Markdown>
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
          <ContactBlock />
          <section
            id="zayavka"
            className="scroll-mt-24 rounded-2xl bg-card p-6 text-card-foreground ring-1 ring-foreground/10 sm:p-8"
          >
            <GeneralRequestForm
              title={CONTACTS_PAGE.formTitle}
              description={CONTACTS_PAGE.formDescription}
            />
          </section>
        </div>
        <AgentsSection />
        <section aria-labelledby="map-title" className="flex flex-col gap-6">
          <SectionHeading id="map-title" eyebrow={CONTACTS_PAGE.mapEyebrow} title={CONTACTS_PAGE.mapTitle} />
          <StaticMap lat={CONTACTS.coordinates.lat} lng={CONTACTS.coordinates.lng} address={CONTACTS.address} />
        </section>
      </div>
    </div>
  );
};

export default ContactsPage;
