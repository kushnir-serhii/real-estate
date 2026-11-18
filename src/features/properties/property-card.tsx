import { BedDouble, Building2, Layers, MapPin, Ruler, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { ViewTransition } from "react";

import type { PublishedProperty } from "@/lib/db/properties";
import { formatPrice } from "@/lib/format/format-price";
import { formatShortDate } from "@/lib/format/format-short-date";
import { cn } from "@/lib/utils";
import { photoSrcSet } from "@/lib/photos/photo-src-set";
import { photoUrl } from "@/lib/photos/photo-url";
import { FavoriteButton } from "@/features/favorites/favorite-button";
import { CardPhotoSlider, type CardPhotoSlide } from "./card-photo-slider";
import { DEAL_LABELS, PROPERTY_TYPE_LABELS } from "./property-labels";

type PropertyCardProps = {
  property: PublishedProperty;
  /** `sizes` attribute for the photo: how wide the card is in the layout. */
  imageSizes?: string;
  /** Load the photo eagerly (first row above the fold). */
  priority?: boolean;
  /** Set for a recently hidden property (sold / rented): muted photo and a status badge instead of the deal badge. */
  soldLabel?: string;
  /** Shared-element transition to the property page: the photo morphs into the gallery. Only where the property appears once on the page. */
  transitionPhoto?: boolean;
};

// Fallback intrinsic size when a photo has no stored dimensions; the box is a fixed 4:3 anyway.
const FALLBACK_WIDTH = 640;
const FALLBACK_HEIGHT = 480;

// Slides per card: enough to get a feel for the place, few enough to keep the card light.
const MAX_SLIDES = 8;

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

const MaybeViewTransition = ({ name, children }: { name?: string; children: React.ReactNode }) =>
  name ? (
    <ViewTransition name={name} share="property-photo" default="none">
      {children}
    </ViewTransition>
  ) : (
    children
  );

/**
 * Card is an `article` with the title link stretched over it, so the favorites button
 * (beside the price) and the photo slider buttons (left / right middle) sit above the link without nesting
 * interactive elements. Inside the catalog's switchable grid in its one-column view (`.catalog-list-view` on <html>), the card turns
 * horizontal from sm: the photo on the left, the details beside it.
 */
export const PropertyCard = ({
  property,
  imageSizes = DEFAULT_IMAGE_SIZES,
  priority = false,
  soldLabel,
  transitionPhoto = false,
}: PropertyCardProps) => {
  const slides: CardPhotoSlide[] = property.property_photos.slice(0, MAX_SLIDES).map((photo) => ({
    src: photoUrl(photo.r2_key),
    srcSet: photoSrcSet(photo.sizes),
    width: photo.width ?? FALLBACK_WIDTH,
    height: photo.height ?? FALLBACK_HEIGHT,
  }));
  const hasPhoto = slides.length > 0;
  const facts = buildFacts(property);
  const published = formatShortDate(property.published_at);
  // Missing currency on a priced row is a data gap: treat it as price on request.
  const price =
    property.price_amount !== null && property.currency !== null
      ? formatPrice(property.price_amount, property.currency, property.deal)
      : formatPrice(null, "USD");
  // «12 500 000 ₴ / доба»: the amount in the heading font, the unit smaller beside it.
  const [amount, unit] = price.split(" / ");

  return (
    // The hover target is this wrapper, which does not move: lifting the hovered element itself makes it jump in a loop
    // when the cursor sits on its bottom edge (the card rises from under the cursor, loses hover, drops back).
    <div className="group h-full">
      <article className="relative flex h-full flex-col sm:[.catalog-list-view_[data-catalog-list]_&]:flex-row rounded-lg bg-transparent text-card-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-background">
        <MaybeViewTransition name={transitionPhoto ? `property-photo-${property.id}` : undefined}>
        <div className="relative aspect-4/3 w-full overflow-hidden rounded-lg bg-muted sm:[.catalog-list-view_[data-catalog-list]_&]:aspect-auto sm:[.catalog-list-view_[data-catalog-list]_&]:min-h-60 sm:[.catalog-list-view_[data-catalog-list]_&]:w-2/5 sm:[.catalog-list-view_[data-catalog-list]_&]:shrink-0 lg:[.catalog-list-view_[data-catalog-list]_&]:min-h-64">
          {hasPhoto ? (
            <>
              <CardPhotoSlider slides={slides} sizes={imageSizes} priority={priority} muted={Boolean(soldLabel)} />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-scrim to-transparent"
              />
            </>
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2 bg-linear-to-br from-brand/15 to-muted text-muted-foreground">
              <Building2 className="size-8" aria-hidden="true" />
              <span className="text-sm">Фото незабаром</span>
            </div>
          )}
          <span className="absolute top-3 left-3 max-w-[calc(100%-1.5rem)] truncate rounded-control bg-background/90 px-3 py-1 text-xs font-semibold text-foreground backdrop-blur">
            {soldLabel ?? `${DEAL_LABELS[property.deal]} · ${PROPERTY_TYPE_LABELS[property.property_type]}`}
          </span>
          {property.is_exclusive && !soldLabel && (
            <span className="absolute bottom-3 left-3 rounded-control bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              Ексклюзив
            </span>
          )}
        </div>
        </MaybeViewTransition>
        <div className="flex min-w-0 flex-1 flex-col gap-2 pt-4 sm:[.catalog-list-view_[data-catalog-list]_&]:px-6 sm:[.catalog-list-view_[data-catalog-list]_&]:py-1 lg:[.catalog-list-view_[data-catalog-list]_&]:px-8 lg:[.catalog-list-view_[data-catalog-list]_&]:py-2">
          <div className="flex items-start justify-between gap-2">
            <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 pt-1.5 text-xl font-semibold tabular-nums sm:text-price">
              <span>{amount}</span>
              {unit && <span className="font-sans text-base font-medium text-muted-foreground">/ {unit}</span>}
            </p>
            {/* -me-2.5 puts the heart's edge on the card's edge; the 44px hit area stays. Above the stretched title link (z-10). */}
            <FavoriteButton propertyId={property.id} className="-me-2.5" />
          </div>
          <h3
            className="line-clamp-2 font-sans text-lg font-medium tracking-normal break-words transition-colors duration-(--duration-fast) group-hover:text-brand-text"
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
            <ul className="mt-auto flex flex-wrap gap-x-5 gap-y-2 pt-3 text-base text-muted-foreground">
              {facts.map(({ key, icon: Icon, text }) => (
                <li key={key} className="inline-flex min-w-0 items-center gap-1.5">
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{text}</span>
                </li>
              ))}
            </ul>
          )}
          {published && (
            <p className={cn("text-sm text-muted-foreground", facts.length === 0 && "mt-auto pt-3")}>
              Опубліковано <time dateTime={property.published_at ?? undefined}>{published}</time>
            </p>
          )}
        </div>
      </article>
    </div>
  );
};
