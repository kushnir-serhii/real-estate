import { BedDouble, Building2, Layers, MapPin, Ruler, type LucideIcon } from "lucide-react";
import Link from "next/link";

import type { PublishedProperty } from "@/lib/db/properties";
import { formatPrice } from "@/lib/format/format-price";
import { photoSrcSet } from "@/lib/photos/photo-src-set";
import { photoUrl } from "@/lib/photos/photo-url";
import { FavoriteButton } from "@/features/favorites/favorite-button";
import { cn } from "@/lib/utils";
import { DEAL_LABELS, PROPERTY_TYPE_LABELS } from "./property-labels";

type PropertyCardProps = {
  property: PublishedProperty;
  /** `sizes` attribute for the photo: how wide the card is in the layout. */
  imageSizes?: string;
  /** Load the photo eagerly (first row above the fold). */
  priority?: boolean;
  /** Set for a recently hidden property (sold / rented): muted photo and a status badge instead of the deal badge. */
  soldLabel?: string;
};

// Fallback intrinsic size when a photo has no stored dimensions; the box is a fixed 4:3 anyway.
const FALLBACK_WIDTH = 640;
const FALLBACK_HEIGHT = 480;

const DEFAULT_IMAGE_SIZES = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

const numberFormat = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 1 });

type Fact = { key: string; icon: LucideIcon; text: string };

const buildFacts = (p: PublishedProperty): Fact[] => {
  const area =
    p.property_type === "plot"
      ? p.area_lot !== null
        ? `${numberFormat.format(p.area_lot)} сот.`
        : null
      : p.area_total !== null
        ? `${numberFormat.format(p.area_total)} м²`
        : null;
  const place = p.district ?? p.locality;
  return [
    ...(p.room_count !== null && p.property_type !== "plot"
      ? [{ key: "rooms", icon: BedDouble, text: `${p.room_count} кімн.` }]
      : []),
    ...(area ? [{ key: "area", icon: Ruler, text: area }] : []),
    ...(p.storey !== null
      ? [
          {
            key: "floor",
            icon: Layers,
            text: p.storeys !== null ? `${p.storey}/${p.storeys} поверх` : `${p.storey} поверх`,
          },
        ]
      : []),
    ...(place ? [{ key: "place", icon: MapPin, text: place }] : []),
  ];
};

/**
 * Card is an `article` with the title link stretched over it, so the favorites button
 * (top-right of the photo, above the link) can sit inside without nesting interactive elements.
 */
export const PropertyCard = ({
  property,
  imageSizes = DEFAULT_IMAGE_SIZES,
  priority = false,
  soldLabel,
}: PropertyCardProps) => {
  const photo = property.property_photos[0];
  const facts = buildFacts(property);
  // Missing currency on a priced row is a data gap: treat it as price on request.
  const price =
    property.price_amount !== null && property.currency !== null
      ? formatPrice(property.price_amount, property.currency, property.deal)
      : formatPrice(null, "USD");
  const srcSet = photo ? photoSrcSet(photo.sizes) : undefined;
  // «12 500 000 ₴ / доба»: the amount in the heading font, the unit smaller beside it.
  const [amount, unit] = price.split(" / ");

  return (
    // The hover target is this wrapper, which does not move: lifting the hovered element itself makes it jump in a loop
    // when the cursor sits on its bottom edge (the card rises from under the cursor, loses hover, drops back).
    <div className="group h-full">
      <article className="relative flex h-full flex-col overflow-hidden rounded-2xl bg-card text-card-foreground ring-1 ring-foreground/5 transition-[transform,box-shadow] duration-(--duration-base) ease-(--ease-out-soft) group-hover:-translate-y-1 group-hover:shadow-float has-focus-visible:ring-3 has-focus-visible:ring-ring motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
        <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- photos come from R2/public; Workers has no image optimizer
            <img
              src={photoUrl(photo.r2_key)}
              srcSet={srcSet}
              sizes={srcSet ? imageSizes : undefined}
              alt=""
              width={photo.width ?? FALLBACK_WIDTH}
              height={photo.height ?? FALLBACK_HEIGHT}
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : undefined}
              decoding="async"
              className={cn(
                "size-full object-cover transition-transform duration-(--duration-slow) ease-(--ease-out-soft) group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100",
                soldLabel && "opacity-60 grayscale",
              )}
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2 bg-linear-to-br from-sky/25 to-muted text-muted-foreground">
              <Building2 className="size-8" aria-hidden="true" />
              <span className="text-sm">Фото незабаром</span>
            </div>
          )}
          {photo && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-scrim to-transparent"
            />
          )}
          <span className="absolute top-3 left-3 max-w-[calc(100%-4.5rem)] truncate rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-foreground backdrop-blur">
            {soldLabel ?? `${DEAL_LABELS[property.deal]} · ${PROPERTY_TYPE_LABELS[property.property_type]}`}
          </span>
          <FavoriteButton propertyId={property.id} />
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
          <p className="flex flex-wrap items-baseline gap-x-1.5 font-heading text-lg font-semibold tracking-tight tabular-nums sm:text-xl">
            <span>{amount}</span>
            {unit && <span className="font-sans text-sm font-medium text-muted-foreground">/ {unit}</span>}
          </p>
          <h3
            className="line-clamp-2 font-sans text-base font-medium tracking-normal break-words transition-colors duration-(--duration-fast) group-hover:text-dawn-text"
            title={property.title}
          >
            <Link
              href={`/catalog/${property.slug}`}
              className="outline-none after:absolute after:inset-0 after:content-['']"
            >
              {property.title}
            </Link>
          </h3>
          {facts.length > 0 && (
            <ul className="mt-auto flex flex-wrap gap-x-4 gap-y-1.5 pt-2 text-sm text-muted-foreground">
              {facts.map(({ key, icon: Icon, text }) => (
                <li key={key} className="inline-flex min-w-0 items-center gap-1.5">
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </article>
    </div>
  );
};
