"use client";

import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { ERROR_PAGE } from "@/constants/inner-pages";

type SiteErrorProps = { error: Error & { digest?: string }; reset: () => void };

const SiteError = ({ reset }: SiteErrorProps) => (
  <PageHeader
    width="narrow"
    alert
    eyebrow={ERROR_PAGE.eyebrow}
    title={ERROR_PAGE.title}
    lead={ERROR_PAGE.lead}
    className="pt-16 pb-24"
  >
    <Button type="button" variant="dawn" size="lg" onClick={reset}>
      {ERROR_PAGE.retry}
    </Button>
    <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
      {ERROR_PAGE.home}
    </Link>
  </PageHeader>
);

export default SiteError;
