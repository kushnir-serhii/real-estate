import { PropertyCard } from "@/features/properties/property-card";
import type { PublishedProperty } from "@/lib/db/properties";

type PropertySimilarProps = { items: PublishedProperty[] };

const SIMILAR_IMAGE_SIZES = "(min-width: 1152px) 17rem, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw";

export const PropertySimilar = ({ items }: PropertySimilarProps) => {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="property-similar-title">
      <h2 id="property-similar-title" className="text-2xl font-bold">
        Схожі об&apos;єкти
      </h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <li key={item.id}>
            <PropertyCard property={item} imageSizes={SIMILAR_IMAGE_SIZES} />
          </li>
        ))}
      </ul>
    </section>
  );
};
