import { ArrowRight, Phone } from "lucide-react";
import Link from "next/link";

import { MessengerLinks } from "@/components/layout/messenger-links";
import { CTA_LINK } from "@/components/layout/nav-config";
import { buttonVariants } from "@/components/ui/button";
import { BLOG_POST_PAGE } from "@/constants/blog";
import { CONTACTS } from "@/constants/contacts";
import { cn } from "@/lib/utils";

/** Closing call to action: a link to the request form on «Контакти» (no form, so no extra JS on the article). */
export const BlogCta = () => (
  <section
    aria-labelledby="blog-cta-title"
    className="relative isolate flex flex-col gap-4 overflow-hidden rounded-3xl bg-ink p-6 text-on-ink sm:p-8"
  >
    <span aria-hidden="true" className="absolute -top-24 -right-16 -z-10 size-72 rounded-full bg-sky/30 blur-3xl" />
    <span aria-hidden="true" className="h-1 w-12 rounded-full bg-dawn" />
    <h2 id="blog-cta-title" className="text-h3">
      {BLOG_POST_PAGE.ctaTitle}
    </h2>
    <p className="max-w-xl text-ink-muted">{BLOG_POST_PAGE.ctaLead}</p>
    <div className="flex flex-wrap items-center gap-2">
      <Link href={CTA_LINK.href} className={buttonVariants({ variant: "dawn", size: "lg" })}>
        {BLOG_POST_PAGE.ctaAction}
        <ArrowRight data-icon="inline-end" aria-hidden="true" />
      </Link>
      <a
        href={CONTACTS.phone.href}
        className={cn(
          buttonVariants({ variant: "outline", size: "lg" }),
          "border-ink-border bg-transparent text-on-ink hover:bg-on-ink/10 hover:text-on-ink",
        )}
      >
        <Phone aria-hidden="true" />
        <span className="tabular-nums">{CONTACTS.phone.display}</span>
      </a>
    </div>
    <MessengerLinks tone="ink" />
  </section>
);
