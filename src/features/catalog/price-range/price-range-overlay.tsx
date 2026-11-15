"use client";

import { useSyncExternalStore } from "react";
import type { RefObject } from "react";

import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PriceRangePanel } from "./price-range-panel";
import type { PriceValue } from "./price-range-math";

type PriceRangeOverlayProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The «Бюджет» button: the popover hangs under it and focus returns to it. */
  anchorRef: RefObject<HTMLButtonElement | null>;
  query: string;
  value: PriceValue;
  onChange: (next: PriceValue) => void;
  onSubmit: () => void;
};

/** From this width the panel is a popover under the field (Tailwind `sm`), below it a bottom sheet. */
const POPOVER_QUERY = "(min-width: 40rem)";

const subscribe = (notify: () => void) => {
  const media = window.matchMedia(POPOVER_QUERY);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};

/** Popover (desktop) or bottom sheet (phone) around the price panel. Loaded on the first click on «Бюджет». */
export const PriceRangeOverlay = ({
  open,
  onOpenChange,
  anchorRef,
  query,
  value,
  onChange,
  onSubmit,
}: PriceRangeOverlayProps) => {
  const isPopover = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(POPOVER_QUERY).matches,
    () => true,
  );

  if (isPopover) {
    return (
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverAnchor virtualRef={anchorRef} />
        <PopoverContent
          aria-label="Ціна"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            anchorRef.current?.focus();
          }}
          // A click on the button itself toggles the panel; don't let "outside click" close it first.
          onInteractOutside={(event) => {
            // `target` of a pointer / focus event is a DOM node.
            if (anchorRef.current?.contains(event.target as Node)) event.preventDefault();
          }}
        >
          <PriceRangePanel query={query} value={value} onChange={onChange} onSubmit={onSubmit} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[90dvh] overflow-y-auto"
        // Don't focus the first field on open: on a phone that pops the keyboard over the chart.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          // `target` is the dialog content element.
          (event.target as HTMLElement).focus();
        }}
      >
        <SheetHeader className="pb-0">
          <SheetTitle className="text-xl leading-tight font-semibold">Ціна</SheetTitle>
          <SheetDescription className="sr-only">Оберіть діапазон ціни і натисніть «Показати»</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">
          <PriceRangePanel query={query} value={value} onChange={onChange} onSubmit={onSubmit} showTitle={false} />
        </div>
      </SheetContent>
    </Sheet>
  );
};
