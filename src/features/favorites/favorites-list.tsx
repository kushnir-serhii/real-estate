"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CatalogGrid } from "@/features/catalog/catalog-grid";
import { CatalogSkeleton } from "@/features/catalog/catalog-skeleton";
import { PropertyCard } from "@/features/properties/property-card";
import { soldStatusLabel } from "@/features/property/sold-status-label";
import type { FavoriteProperty } from "@/lib/db/properties";
import { FavoritesEmpty } from "./favorites-empty";
import { objectsCount } from "./favorites-label";
import { useFavorites, useHydrated } from "./favorites-store";
import { FavoritesUnavailable } from "./favorites-unavailable";

const responseSchema = z.object({
  items: z.array(
    z.object({
      kind: z.enum(["published", "sold"]),
      // Produced by our own route handler from the same type; not re-validated field by field.
      property: z.custom<FavoriteProperty["property"]>((value) => typeof value === "object" && value !== null),
    }),
  ),
});

const fetchFavorites = async (ids: string[], signal: AbortSignal): Promise<FavoriteProperty[]> => {
  const response = await fetch("/api/favorites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
    signal,
  });
  if (!response.ok) throw new Error(`favorites ${response.status}`);
  return responseSchema.parse(await response.json()).items;
};

/** id -> loaded property, or `null` when the server doesn't return it (unavailable). */
type Cache = Record<string, FavoriteProperty | null>;

export const FavoritesList = () => {
  const hydrated = useHydrated();
  const ids = useFavorites();
  const [cache, setCache] = useState<Cache>({});
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!hydrated || failed) return;
    const missing = ids.filter((id) => !(id in cache));
    if (missing.length === 0) return;
    const controller = new AbortController();
    fetchFavorites(missing, controller.signal)
      .then((items) => {
        const loaded = new Map(items.map((item) => [item.property.id, item]));
        setCache((prev) => {
          const next = { ...prev };
          for (const id of missing) next[id] = loaded.get(id) ?? null;
          return next;
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFailed(true);
      });
    return () => controller.abort();
  }, [hydrated, ids, cache, failed]);

  if (!hydrated) return <CatalogSkeleton />;
  if (ids.length === 0) return <FavoritesEmpty />;

  if (failed && ids.some((id) => !(id in cache))) {
    return (
      <div role="alert" className="flex flex-col items-start gap-4 rounded-xl border border-dashed border-border p-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">Не вдалося завантажити обране</h2>
          <p className="max-w-prose text-muted-foreground">
            Ваш список збережено. Перевірте з&apos;єднання й спробуйте ще раз.
          </p>
        </div>
        <Button type="button" onClick={() => setFailed(false)}>
          <RefreshCw aria-hidden="true" />
          Спробувати ще раз
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p role="status" className="text-sm text-muted-foreground tabular-nums">
        {objectsCount(ids.length)}
      </p>
      <CatalogGrid>
        {ids.map((id) => {
          const entry = cache[id];
          return (
            <li key={id} className="min-w-0">
              {entry === undefined ? (
                <Skeleton className="aspect-4/3 w-full" />
              ) : entry === null ? (
                <FavoritesUnavailable propertyId={id} />
              ) : (
                <PropertyCard
                  property={entry.property}
                  soldLabel={entry.kind === "sold" ? soldStatusLabel(entry.property.deal) : undefined}
                />
              )}
            </li>
          );
        })}
      </CatalogGrid>
    </div>
  );
};
