import { Plus } from "lucide-react";

import { JsonLd } from "@/components/seo/json-ld";
import { SectionHeading } from "@/components/section-heading";
import { FAQ } from "@/constants/home";
import { faqSchema } from "@/features/seo/schemas";
import { HomeSection } from "./home-section";

/** Native `<details>` accordion: works without JS and by keyboard. The plus turns into a cross via CSS. */
export const Faq = () => (
  <HomeSection labelledBy="faq-title">
    <JsonLd data={faqSchema(FAQ.items)} />
    <div className="grid gap-8 lg:grid-cols-[1fr_2fr] lg:gap-16">
      <div className="reveal">
        <SectionHeading id="faq-title" eyebrow={FAQ.eyebrow} title={FAQ.title} />
      </div>
      <div className="reveal border-t border-border">
        {FAQ.items.map((item) => (
          <details key={item.question} className="group/faq border-b border-border">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg font-semibold outline-none marker:hidden hover:text-brand-text focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 break-words">{item.question}</span>
              <Plus
                className="size-5 shrink-0 text-brand-text transition-transform duration-(--duration-base) ease-(--ease-out-soft) group-open/faq:rotate-45 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </summary>
            <p className="max-w-prose pb-5 text-muted-foreground">{item.answer}</p>
          </details>
        ))}
      </div>
    </div>
  </HomeSection>
);
