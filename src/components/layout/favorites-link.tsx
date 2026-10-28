"use client";

import { Heart } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { favoritesLinkLabel } from "@/features/favorites/favorites-label";
import { useFavorites } from "@/features/favorites/favorites-store";
import { cn } from "@/lib/utils";

/** Header heart with a count badge. The count is client-only; the badge overlays the icon, so nothing shifts. */
export const FavoritesLink = ({ className }: { className?: string }) => {
  const count = useFavorites().length;

  return (
    <Link
      href="/favorites"
      aria-label={favoritesLinkLabel(count)}
      className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative", className)}
    >
      <Heart aria-hidden="true" className={cn(count > 0 && "fill-current text-primary")} />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-0.5 right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground tabular-nums"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
};
