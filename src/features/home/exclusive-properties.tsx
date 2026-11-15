import "server-only";

import { PropertyCard } from "@/features/properties/property-card";
import { getExclusiveProperties } from "@/lib/db/properties";
import type { PublishedProperty } from "@/lib/db/properties";
import { hasPublicData } from "@/lib/data-driver";
import { PropertiesEmpty, PropertiesError } from "./property-states";

type State = { kind: "ready"; items: PublishedProperty[] } | { kind: "empty" } | { kind: "error" };

const load = async (): Promise<State> => {
  if (!hasPublicData()) return { kind: "empty" };
  try {
    const items = await getExclusiveProperties();
    return items.length > 0 ? { kind: "ready", items } : { kind: "empty" };
  } catch {
    return { kind: "error" };
  }
};

/** «Ексклюзивні об'єкти»: larger cards, two columns from md, more air between them. */
export const ExclusiveProperties = async () => {
  const state = await load();
  if (state.kind === "empty") return <PropertiesEmpty />;
  if (state.kind === "error") return <PropertiesError />;
  return (
    <ul className="reveal-curtain-stagger grid gap-x-8 gap-y-10 md:grid-cols-2 lg:gap-x-10 lg:gap-y-14">
      {state.items.map((property) => (
        <li key={property.id}>
          <PropertyCard
            property={property}
            size="lg"
            imageSizes="(min-width: 1536px) 700px, (min-width: 768px) 50vw, 100vw"
          />
        </li>
      ))}
    </ul>
  );
};
