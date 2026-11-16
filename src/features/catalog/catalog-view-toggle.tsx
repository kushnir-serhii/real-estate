"use client";

import { LayoutGrid, Rows3, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CatalogView } from "./catalog-view";
import { setCatalogView, useCatalogView } from "./catalog-view-store";

const OPTIONS: { view: CatalogView; label: string; icon: LucideIcon }[] = [
  { view: "grid", label: "Сіткою", icon: LayoutGrid },
  { view: "list", label: "Одним стовпцем", icon: Rows3 },
];

type CatalogViewToggleProps = { className?: string };

/**
 * Grid / one column switch for the catalog cards: a labelled group of two toggle buttons (`aria-pressed`).
 * Not a form control: the view is a display preference kept in localStorage, not part of the URL.
 */
export const CatalogViewToggle = ({ className }: CatalogViewToggleProps) => {
  const current = useCatalogView();
  return (
    <div
      role="group"
      aria-label="Вигляд списку"
      className={cn("inline-flex h-11 items-center gap-1 rounded-control border border-control bg-background p-1", className)}
    >
      {OPTIONS.map(({ view, label, icon: Icon }) => {
        const pressed = current === view;
        return (
          <button
            key={view}
            type="button"
            aria-pressed={pressed}
            aria-label={label}
            title={label}
            onClick={() => setCatalogView(view)}
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-[calc(var(--radius-control)-0.25rem)] text-muted-foreground outline-none transition-colors duration-(--duration-fast) hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none",
              pressed && "bg-muted text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
};
