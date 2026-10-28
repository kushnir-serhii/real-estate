"use client";

import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type FiltersSheetProps = { activeCount: number; children: React.ReactNode };

/**
 * Mobile filters. The page keys this component by the query string, so after «Показати»
 * (a navigation) it remounts closed.
 */
export const FiltersSheet = ({ activeCount, children }: FiltersSheetProps) => (
  <Sheet>
    <SheetTrigger asChild>
      <Button variant="outline">
        <SlidersHorizontal aria-hidden="true" />
        {activeCount > 0 ? `Фільтри (${activeCount})` : "Фільтри"}
      </Button>
    </SheetTrigger>
    <SheetContent side="right" className="overflow-y-auto data-[side=right]:w-full">
      <SheetHeader className="pb-0">
        <SheetTitle className="text-lg font-bold">Фільтри</SheetTitle>
        <SheetDescription className="sr-only">
          Оберіть параметри і натисніть «Показати»
        </SheetDescription>
      </SheetHeader>
      <div className="px-4">{children}</div>
    </SheetContent>
  </Sheet>
);
