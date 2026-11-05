"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { PROPERTY_ERROR } from "@/constants/inner-pages";

type PropertyErrorProps = { error: Error & { digest?: string }; reset: () => void };

const PropertyError = ({ reset }: PropertyErrorProps) => {
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
      eyebrow={PROPERTY_ERROR.eyebrow}
      title={PROPERTY_ERROR.title}
      lead={PROPERTY_ERROR.lead}
      className="pt-16 pb-24"
    >
      <Button type="button" variant="dawn" size="lg" onClick={retry} disabled={pending}>
        <RefreshCw className={pending ? "animate-spin" : undefined} aria-hidden="true" />
        {PROPERTY_ERROR.retry}
      </Button>
      <Link href="/catalog" className={buttonVariants({ variant: "outline", size: "lg" })}>
        {PROPERTY_ERROR.catalog}
      </Link>
    </PageHeader>
  );
};

export default PropertyError;
