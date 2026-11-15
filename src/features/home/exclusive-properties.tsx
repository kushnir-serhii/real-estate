import "server-only";

import { EXCLUSIVE } from "@/constants/home";
import { PropertyCard } from "@/features/properties/property-card";
import { getExclusiveProperties } from "@/lib/db/properties";
import type { PublishedProperty } from "@/lib/db/properties";
import { hasPublicData } from "@/lib/data-driver";
import { PropertiesEmpty, PropertiesError } from "./property-states";

type State = { kind: "ready"; items: PublishedProperty[] } | { kind: "empty" } | { kind: "error" };

const load = async (): Promise<State> => {
  if (!hasPublicData()) return { kind: "empty" };
  try {
    const items = await getExclusiveProperties(EXCLUSIVE.count);
    return items.length > 0 ? { kind: "ready", items } : { kind: "empty" };
  } catch {
    return { kind: "error" };
  }
};

/** «Ексклюзивні об'єкти»: three regular cards in one row from md. */
export const ExclusiveProperties = async () => {
  const state = await load();
  if (state.kind === "empty") return <PropertiesEmpty />;
  if (state.kind === "error") return <PropertiesError />;
  return (
    <ul className="reveal-curtain-stagger grid gap-6 md:grid-cols-3 lg:gap-8">
      {state.items.map((property) => (
        <li key={property.id}>
          <PropertyCard
            property={property}
            imageSizes="(min-width: 1280px) 400px, (min-width: 768px) 33vw, 100vw"
          />
        </li>
      ))}
    </ul>
  );
};
