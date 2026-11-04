"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

/** Loads the page's server data again (the transcript only), keeping the lead on screen. */
export const TranscriptRetry = () => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button type="button" variant="outline" onClick={() => startTransition(() => router.refresh())} disabled={pending}>
      <RefreshCw className={pending ? "animate-spin" : undefined} aria-hidden="true" />
      Спробувати ще раз
    </Button>
  );
};
