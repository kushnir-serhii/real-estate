import { ArrowLeft, ArrowRight, CircleCheck } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { DEAL_LABELS, PROPERTY_TYPE_LABELS } from "@/features/properties/property-labels";
import type { PublishedProperty } from "@/lib/db/properties";
import { cn } from "@/lib/utils";
import { locationText, priceText, shortFacts } from "./property-details";
import { SimilarProperties } from "./similar-properties";
import { SoldContactBlock } from "./sold-contact-block";
import { SoldPropertyPhoto } from "./sold-property-photo";
import { soldStatusLabel } from "./sold-status-label";

type SoldPropertyViewProps = { property: PublishedProperty };

/**
 * Page of a property hidden less than SOLD_PAGE_DAYS ago: a calm «sold» notice instead of a dead link.
 * No gallery, no agent, no request CTA for this property: only the agency's «Підберемо схожий» and similar ones.
 */
export const SoldPropertyView = ({ property }: SoldPropertyViewProps) => {
  const status = soldStatusLabel(property.deal);
  const facts = shortFacts(property);
  const location = locationText(property);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-2 pb-12 sm:pt-4 lg:pb-16">
      <Link
        href={`/catalog?deal=${property.deal}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        До каталогу
      </Link>

      <div className="mt-2 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-10">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex items-start gap-3 rounded-xl bg-secondary p-4 text-secondary-foreground">
            <CircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-bold">{status}</p>
              <p className="mt-1 text-sm">
                Цей об&apos;єкт більше не доступний. Подивіться схожі або залиште запит, і ми підберемо
                варіант.
              </p>
            </div>
          </div>

          <SoldPropertyPhoto photo={property.property_photos[0]} status={status} />

          <header className="flex flex-col gap-2">
            <p className="text-sm font-medium text-muted-foreground">
              {DEAL_LABELS[property.deal]} · {PROPERTY_TYPE_LABELS[property.property_type]}
            </p>
            <h1 className="text-2xl font-bold break-words text-balance sm:text-3xl">{property.title}</h1>
            {location && <p className="break-words text-muted-foreground">{location}</p>}
            <p className="mt-2 text-muted-foreground">
              Остання ціна: <span className="font-semibold break-words tabular-nums">{priceText(property)}</span>
            </p>
            {facts.length > 0 && <p>{facts.join(" · ")}</p>}
          </header>
        </div>

        <aside aria-label="Контакти агентства" className="mt-8 lg:sticky lg:top-24 lg:mt-0">
          <SoldContactBlock />
        </aside>
      </div>

      <Suspense fallback={null}>
        <SimilarProperties property={property} className="mt-12" />
      </Suspense>

      <Link href="/catalog" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-8")}>
        Усі об&apos;єкти в каталозі
        <ArrowRight aria-hidden="true" />
      </Link>
    </div>
  );
};
