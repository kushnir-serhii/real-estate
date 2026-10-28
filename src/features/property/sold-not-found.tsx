import "server-only";

import Link from "next/link";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FeaturedGrid } from "@/features/home/featured-grid";
import { FeaturedSkeleton } from "@/features/home/featured-skeleton";
import { PropertyCard } from "@/features/properties/property-card";
import { getPublishedProperties, propertyFiltersSchema } from "@/lib/db/properties";
import { getSupabasePublicEnvOrNull } from "@/lib/supabase/env";

const NEWEST_COUNT = 3;

/** Newest published properties; non-essential, so no data or a failed query hides the block. */
const NewestProperties = async () => {
  if (getSupabasePublicEnvOrNull() === null) return null;
  const items = await getPublishedProperties(propertyFiltersSchema.parse({ sort: "newest" }))
    .then((page) => page.items.slice(0, NEWEST_COUNT))
    .catch((error: unknown) => {
      console.error("newest properties", error);
      return [];
    });
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="newest-title" className="mt-12">
      <h2 id="newest-title" className="text-2xl font-bold">
        Нові пропозиції
      </h2>
      <div className="mt-4">
        <FeaturedGrid>
          {items.map((property) => (
            <li key={property.id}>
              <PropertyCard property={property} />
            </li>
          ))}
        </FeaturedGrid>
      </div>
    </section>
  );
};

const NewestSkeleton = () => (
  <div className="mt-12" aria-hidden="true">
    <Skeleton className="h-8 w-48" />
    <div className="mt-4">
      <FeaturedSkeleton count={NEWEST_COUNT} />
    </div>
  </div>
);

/** 404 of a property URL: sold or removed more than a week ago, or never existed. */
export const SoldNotFound = () => (
  <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:py-16">
    <div className="flex max-w-3xl flex-col items-start gap-5">
      <h1 className="text-3xl font-bold text-balance sm:text-4xl">
        Цей об&apos;єкт уже продано або знято з продажу
      </h1>
      <p className="max-w-prose text-muted-foreground">
        Але в нас є інші варіанти. Перегляньте каталог або зверніться до нас, і ми підберемо житло під
        ваш запит.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link href="/catalog" className={buttonVariants({ size: "lg" })}>
          До каталогу
        </Link>
        <Link href="/contacts" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Контакти
        </Link>
      </div>
    </div>

    <Suspense fallback={<NewestSkeleton />}>
      <NewestProperties />
    </Suspense>
  </div>
);
