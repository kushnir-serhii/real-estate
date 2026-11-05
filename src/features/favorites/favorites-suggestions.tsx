import "server-only";

import { SectionHeading } from "@/components/section-heading";
import { FAVORITES_PAGE } from "@/constants/inner-pages";
import { PropertyCard } from "@/features/properties/property-card";
import { hasPublicData } from "@/lib/data-driver";
import { getPublishedProperties, propertyFiltersSchema } from "@/lib/db/properties";
import type { PublishedProperty } from "@/lib/db/properties";

const SUGGESTIONS_COUNT = 3;

/** The newest published listings; non-essential, so any failure just hides the row. */
const loadSuggestions = async (): Promise<PublishedProperty[]> => {
  if (!hasPublicData()) return [];
  try {
    const page = await getPublishedProperties(propertyFiltersSchema.parse({ sort: "newest" }));
    return page.items.slice(0, SUGGESTIONS_COUNT);
  } catch (error) {
    console.error("favorites suggestions", error);
    return [];
  }
};

export const FavoritesSuggestions = async () => {
  const items = await loadSuggestions();
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="favorites-suggestions-title" className="flex flex-col gap-6">
      <SectionHeading
        id="favorites-suggestions-title"
        eyebrow={FAVORITES_PAGE.suggestionsEyebrow}
        title={FAVORITES_PAGE.suggestionsTitle}
        action={{ href: "/catalog", label: FAVORITES_PAGE.suggestionsAction }}
      />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {items.map((property) => (
          <li key={property.id} className="min-w-0">
            <PropertyCard property={property} />
          </li>
        ))}
      </ul>
    </section>
  );
};
