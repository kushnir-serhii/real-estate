import "server-only";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { PropertyCard } from "@/features/properties/property-card";
import { getPublishedProperties, propertyFiltersSchema } from "@/lib/db/properties";
import type { PublishedProperty } from "@/lib/db/properties";
import { SITE_CONFIG } from "@/lib/site-config";
import { getSupabasePublicEnvOrNull } from "@/lib/supabase/env";
import { FeaturedGrid } from "./featured-grid";
import { RetryButton } from "./retry-button";

const FEATURED_COUNT = 6;

type FeaturedState =
  | { kind: "ready"; items: PublishedProperty[] }
  | { kind: "empty" }
  | { kind: "error" };

const loadFeatured = async (): Promise<FeaturedState> => {
  if (getSupabasePublicEnvOrNull() === null) return { kind: "empty" };
  try {
    const page = await getPublishedProperties(propertyFiltersSchema.parse({ sort: "newest" }));
    const items = page.items.slice(0, FEATURED_COUNT);
    return items.length > 0 ? { kind: "ready", items } : { kind: "empty" };
  } catch {
    return { kind: "error" };
  }
};

export const FeaturedProperties = async () => {
  const state = await loadFeatured();

  switch (state.kind) {
    case "ready":
      return (
        <FeaturedGrid>
          {state.items.map((property) => (
            <li key={property.id}>
              <PropertyCard property={property} />
            </li>
          ))}
        </FeaturedGrid>
      );
    case "empty":
      return (
        <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed border-border p-6">
          <p className="text-muted-foreground">
            Скоро тут з&apos;являться нові об&apos;єкти. А поки зателефонуйте нам, і ми підберемо
            варіанти під ваш запит.
          </p>
          <div className="flex flex-wrap gap-2">
            <a href={SITE_CONFIG.phone.href} className={buttonVariants()}>
              {SITE_CONFIG.phone.display}
            </a>
            <Link href="/contacts" className={buttonVariants({ variant: "outline" })}>
              Контакти
            </Link>
          </div>
        </div>
      );
    case "error":
      return (
        <div
          role="alert"
          className="flex flex-col items-start gap-4 rounded-xl border border-destructive/40 p-6"
        >
          <p className="font-medium text-destructive">Не вдалося завантажити об&apos;єкти</p>
          <RetryButton />
        </div>
      );
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
};
