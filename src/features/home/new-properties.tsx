import "server-only";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { NEW_PROPERTIES } from "@/constants/home";
import { PropertyCard } from "@/features/properties/property-card";
import { getPublishedProperties, propertyFiltersSchema } from "@/lib/db/properties";
import type { PublishedProperty } from "@/lib/db/properties";
import { hasPublicData } from "@/lib/data-driver";
import { FeaturedGrid } from "./featured-grid";
import { PropertiesEmpty, PropertiesError } from "./property-states";

const PER_DEAL = 3;

type Deal = (typeof NEW_PROPERTIES.tabs)[number]["deal"];
type State = { kind: "ready"; items: PublishedProperty[] } | { kind: "empty" } | { kind: "error" };

const load = async (deal: Deal): Promise<State> => {
  if (!hasPublicData()) return { kind: "empty" };
  try {
    const page = await getPublishedProperties(propertyFiltersSchema.parse({ deal, sort: "newest" }));
    const items = page.items.slice(0, PER_DEAL);
    return items.length > 0 ? { kind: "ready", items } : { kind: "empty" };
  } catch {
    return { kind: "error" };
  }
};

const PanelBody = ({ state }: { state: State }) => {
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
      return <p className="text-muted-foreground">{NEW_PROPERTIES.emptyDeal}</p>;
    case "error":
      return <PropertiesError />;
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
};

/**
 * «Нові пропозиції» with deal tabs. Radio inputs + CSS (`.deal-tabs` in globals.css): works without JS and keeps the
 * page static. Inactive panels are display:none, so their lazy photos are not fetched.
 */
export const NewProperties = async () => {
  const states = await Promise.all(NEW_PROPERTIES.tabs.map((tab) => load(tab.deal)));
  // No data at all (no DB): one empty block instead of three empty tabs.
  if (!hasPublicData()) return <PropertiesEmpty />;

  return (
    <div className="deal-tabs flex flex-col gap-6">
      <fieldset className="min-w-0">
        <legend className="sr-only">Тип угоди</legend>
        <div className="grid grid-cols-3 gap-1 bg-muted p-1 sm:max-w-md">
          {NEW_PROPERTIES.tabs.map((tab) => (
            <label
              key={tab.deal}
              className="relative flex h-11 cursor-pointer items-center justify-center rounded-control px-3 text-sm font-semibold text-muted-foreground transition-colors duration-(--duration-fast) hover:text-foreground has-checked:bg-primary has-checked:text-primary-foreground has-checked:hover:text-primary-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
            >
              <input
                type="radio"
                name="new-deal"
                value={tab.deal}
                defaultChecked={tab.deal === "sell"}
                className="sr-only"
              />
              {tab.label}
            </label>
          ))}
        </div>
      </fieldset>
      {NEW_PROPERTIES.tabs.map((tab, index) => (
        <div key={tab.deal} data-deal-panel={tab.deal} className="flex flex-col items-start gap-6">
          <PanelBody state={states[index]} />
          <Link
            href={`/catalog?deal=${tab.deal}`}
            className="group/action inline-flex min-h-11 items-center gap-2 font-medium text-foreground outline-none hover:text-brand-text focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {NEW_PROPERTIES.allAction}
            <ArrowRight
              className="size-4 transition-transform duration-(--duration-base) ease-(--ease-out-soft) group-hover/action:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover/action:translate-x-0"
              aria-hidden="true"
            />
          </Link>
        </div>
      ))}
    </div>
  );
};
