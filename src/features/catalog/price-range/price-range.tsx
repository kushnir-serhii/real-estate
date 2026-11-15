"use client";

import { ChevronDown } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { budgetLabel } from "./budget-label";
import type { Currency, PriceValue } from "./price-range-math";
import { useHistogramContext } from "./use-histogram-context";

// The heavy parts (Radix Slider / Popover, chart, fetch) are separate chunks, fetched on demand.
const loadOverlay = () => import("./price-range-overlay").then((m) => ({ default: m.PriceRangeOverlay }));
const LazyPanel = lazy(() => import("./price-range-panel").then((m) => ({ default: m.PriceRangePanel })));
const LazyOverlay = lazy(loadOverlay);

export type PriceRangeProps = {
  /** `popover`: «Бюджет» button + popover / sheet (home). `inline`: the panel in place (catalog filters). */
  variant: "popover" | "inline";
  id: string;
  defaultFrom?: number;
  defaultTo?: number;
  defaultCurrency?: Currency;
  /** Server-rendered `<noscript>` inputs: the plain fields of the form without JS. */
  children?: React.ReactNode;
};

const subscribe = () => () => {};

/** Same height as the loaded panel, so the filters below do not jump. */
const PanelSkeleton = () => <Skeleton aria-hidden="true" className="h-72 rounded-none" />;

/**
 * Price filter of a GET form. Hidden inputs with the form's names are fed from the state; the lazy panel
 * (histogram, slider, fields) drives it. The chart follows the other filters of the surrounding form.
 */
export const PriceRange = ({
  variant,
  id,
  defaultFrom,
  defaultTo,
  defaultCurrency = "USD",
  children,
}: PriceRangeProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [value, setValue] = useState<PriceValue>({ from: defaultFrom, to: defaultTo, currency: defaultCurrency });
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState(false);
  const [visible, setVisible] = useState(false);
  // false during SSR and the first client render: then only the noscript inputs carry the names.
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);

  const query = useHistogramContext(rootRef);
  const deal = query === null ? null : new URLSearchParams(query).get("deal");

  // A price range from one deal means nothing in another: clear it when the visitor switches the deal.
  const [seenDeal, setSeenDeal] = useState<string | null>(null);
  if (query !== null && (deal ?? "") !== seenDeal) {
    setSeenDeal(deal ?? "");
    if (seenDeal !== null) setValue((v) => ({ currency: v.currency }));
  }

  // Inline: fetch the panel once the group is on screen (a hidden sidebar or a closed sheet never is).
  useEffect(() => {
    const node = rootRef.current;
    if (variant !== "inline" || !node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [variant]);

  const submit = () => {
    setOpen(false);
    buttonRef.current?.closest("form")?.requestSubmit();
  };

  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      {children}
      <div className="nojs-hide contents">
        {variant === "popover" ? (
          <>
            <button
              ref={buttonRef}
              id={hydrated ? id : undefined}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={open}
              onPointerEnter={() => void loadOverlay()}
              onClick={() => {
                setOpened(true);
                setOpen((o) => !o);
              }}
              className={cn(
                "flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-control border border-control bg-background ps-4 pe-3.5 text-start text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
                value.from === undefined && value.to === undefined ? "text-muted-foreground" : "text-foreground",
              )}
            >
              <span className="truncate tabular-nums">{budgetLabel(value.from, value.to, value.currency)}</span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
            {opened && (
              <Suspense fallback={null}>
                <LazyOverlay
                  open={open}
                  onOpenChange={setOpen}
                  anchorRef={buttonRef}
                  query={query ?? ""}
                  value={value}
                  onChange={setValue}
                  onSubmit={submit}
                />
              </Suspense>
            )}
          </>
        ) : visible && query !== null ? (
          <Suspense fallback={<PanelSkeleton />}>
            <LazyPanel query={query} value={value} onChange={setValue} showTitle={false} requireDeal />
          </Suspense>
        ) : (
          <PanelSkeleton />
        )}
      </div>

      {hydrated && (
        <>
          <input type="hidden" name="price_from" value={value.from ?? ""} />
          <input type="hidden" name="price_to" value={value.to ?? ""} />
          <input type="hidden" name="currency" value={value.currency} />
        </>
      )}
    </div>
  );
};
