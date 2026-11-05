import "server-only";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FeaturedGrid } from "@/features/home/featured-grid";
import { FeaturedSkeleton } from "@/features/home/featured-skeleton";
import { PropertyCard } from "@/features/properties/property-card";
import { getPublishedProperties, propertyFiltersSchema } from "@/lib/db/properties";
import { hasPublicData } from "@/lib/data-driver";

const NEWEST_COUNT = 3;

/** Newest published properties; non-essential, so no data or a failed query hides the block. */
const NewestProperties = async () => {
  if (!hasPublicData()) return null;
  const items = await getPublishedProperties(propertyFiltersSchema.parse({ sort: "newest" }))
    .then((page) => page.items.slice(0, NEWEST_COUNT))
    .catch((error: unknown) => {
      console.error("newest properties", error);
      return [];
    });
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="newest-title" className="mt-16">
      <SectionHeading id="newest-title" eyebrow="Каталог" title="Нові пропозиції" />
      <div className="mt-8">
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
  <div className="mt-16" aria-hidden="true">
    <Skeleton className="h-8 w-48" />
    <div className="mt-4">
      <FeaturedSkeleton count={NEWEST_COUNT} />
    </div>
  </div>
);

/** 404 of a property URL: sold or removed more than a week ago, or never existed. */
export const SoldNotFound = () => (
  <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:pb-24">
    <PageHeader
      eyebrow="Об'єкт"
      title="Цей об'єкт уже продано або знято з продажу"
      lead="Але в нас є інші варіанти. Перегляньте каталог або зверніться до нас, і ми підберемо житло під ваш запит."
      className="px-0"
    >
      <Link href="/catalog" className={buttonVariants({ variant: "dawn", size: "lg" })}>
        До каталогу
        <ArrowRight data-icon="inline-end" aria-hidden="true" />
      </Link>
      <Link href="/contacts" className={buttonVariants({ variant: "outline", size: "lg" })}>
        Контакти
      </Link>
    </PageHeader>

    <Suspense fallback={<NewestSkeleton />}>
      <NewestProperties />
    </Suspense>
  </div>
);
