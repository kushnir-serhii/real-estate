import { getSimilarProperties } from "@/lib/db/properties";
import type { PublishedProperty } from "@/lib/db/properties";
import { PropertySimilar } from "./property-similar";

type SimilarPropertiesProps = { property: PublishedProperty; className?: string };

/** Loads and renders similar properties; non-essential, so a failed query just hides the section. */
export const SimilarProperties = async ({ property, className }: SimilarPropertiesProps) => {
  const items = await getSimilarProperties(property).catch((error: unknown) => {
    console.error("similar properties", error);
    return [];
  });
  if (items.length === 0) return null;
  return (
    <div className={className}>
      <PropertySimilar items={items} />
    </div>
  );
};
