"use client";

import { HeartOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { removeFavorite } from "./favorites-store";

/** A saved id the server no longer returns (removed, sold long ago, unknown). */
export const FavoritesUnavailable = ({ propertyId }: { propertyId: string }) => (
  <div className="flex min-h-16 items-center justify-between gap-3 rounded-xl bg-card px-4 py-2 text-card-foreground ring-1 ring-foreground/10">
    <div className="flex items-center gap-3 text-muted-foreground">
      <HeartOff className="size-5 shrink-0" aria-hidden="true" />
      <span>Більше недоступний</span>
    </div>
    <Button type="button" variant="outline" onClick={() => removeFavorite(propertyId)}>
      Прибрати
    </Button>
  </div>
);
