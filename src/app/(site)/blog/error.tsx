"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { BLOG_ERROR } from "@/constants/blog";

type BlogErrorProps = { error: Error & { digest?: string }; reset: () => void };

const BlogError = ({ reset }: BlogErrorProps) => {
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
      eyebrow={BLOG_ERROR.eyebrow}
      title={BLOG_ERROR.title}
      lead={BLOG_ERROR.lead}
      className="pt-16 pb-24"
    >
      <Button type="button" variant="dawn" size="lg" onClick={retry} disabled={pending}>
        <RefreshCw className={pending ? "animate-spin" : undefined} aria-hidden="true" />
        {BLOG_ERROR.retry}
      </Button>
      <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
        {BLOG_ERROR.home}
      </Link>
    </PageHeader>
  );
};

export default BlogError;
