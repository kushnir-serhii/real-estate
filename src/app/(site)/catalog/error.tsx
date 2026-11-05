"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { CATALOG_ERROR } from "@/constants/inner-pages";

type CatalogErrorProps = { error: Error & { digest?: string }; reset: () => void };

const CatalogError = ({ reset }: CatalogErrorProps) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Refetch the server data, then re-render the segment.
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });

  return (
    <PageHeader
      width="narrow"
      alert
      eyebrow={CATALOG_ERROR.eyebrow}
      title={CATALOG_ERROR.title}
      lead={CATALOG_ERROR.lead}
      className="pt-16 pb-24"
    >
      <Button type="button" variant="dawn" size="lg" onClick={retry} disabled={pending}>
        <RefreshCw className={pending ? "animate-spin" : undefined} aria-hidden="true" />
        {CATALOG_ERROR.retry}
      </Button>
      <Link href="/contacts" className={buttonVariants({ variant: "outline", size: "lg" })}>
        {CATALOG_ERROR.contacts}
      </Link>
    </PageHeader>
  );
};

export default CatalogError;
