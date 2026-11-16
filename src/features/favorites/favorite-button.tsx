"use client";

import { Heart } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { toggleFavorite, useIsFavorite } from "./favorites-store";

type FavoriteButtonProps = {
  propertyId: string;
  /** `card`: bare heart with a soft shadow over the photo; `page`: outlined button next to the price. */
  variant?: "card" | "page";
  className?: string;
};

/** Heart toggle. Renders «not saved» on the server and fills after hydration (same box, no shift). */
export const FavoriteButton = ({ propertyId, variant = "card", className }: FavoriteButtonProps) => {
  const saved = useIsFavorite(propertyId);
  const [announcement, setAnnouncement] = useState("");

  return (
    <>
      <button
        type="button"
        aria-pressed={saved}
        aria-label={saved ? "Прибрати з обраного" : "Додати в обране"}
        onClick={() => setAnnouncement(toggleFavorite(propertyId) ? "Додано в обране" : "Прибрано з обраного")}
        className={cn(
          "inline-flex size-11 shrink-0 items-center justify-center rounded-control text-foreground outline-none transition-[color,background-color,transform] focus-visible:ring-3 focus-visible:ring-ring",
          variant === "card"
            ? "absolute top-2 right-2 z-10 text-white hover:scale-110 motion-reduce:hover:scale-100 [&_svg]:drop-shadow-[0_1px_3px_rgb(0_0_0/0.6)]"
            : "bg-card ring-1 ring-foreground/15 hover:bg-muted",
          saved && (variant === "card" ? "text-brand-on-ink" : "text-primary"),
          className,
        )}
      >
        <Heart className={cn("size-5", saved && "fill-current")} aria-hidden="true" />
      </button>
      <span role="status" className="sr-only">
        {announcement}
      </span>
    </>
  );
};
