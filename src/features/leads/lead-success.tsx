"use client";

import { CircleCheck, RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

type LeadSuccessProps = { onAgain: () => void };

/** Replaces the form after a saved request; takes focus so the result is read out and keyboard users stay in place. */
export const LeadSuccess = ({ onAgain }: LeadSuccessProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <div
      ref={ref}
      role="status"
      tabIndex={-1}
      className="flex flex-col items-start gap-4 rounded-lg bg-accent p-5 text-accent-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="flex items-start gap-3">
        <CircleCheck className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="text-lg font-bold">Дякуємо! Заявку отримано.</p>
          <p className="mt-1">Зателефонуємо найближчим часом.</p>
        </div>
      </div>
      <Button type="button" variant="outline" size="lg" onClick={onAgain} className="w-full sm:w-auto">
        <RotateCcw aria-hidden="true" />
        Надіслати ще одну
      </Button>
    </div>
  );
};
