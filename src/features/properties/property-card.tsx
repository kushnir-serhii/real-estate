import { Building2 } from "lucide-react";
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

const buildFacts = (p: PublishedProperty): string[] => {
  const area =
    p.property_type === "plot"
      ? p.area_lot !== null
        ? `${numberFormat.format(p.area_lot)} сот.`
        : null
      : p.area_total !== null
        ? `${numberFormat.format(p.area_total)} м²`
        : null;
  return [
    ...(p.room_count !== null && p.property_type !== "plot" ? [`${p.room_count} кімн.`] : []),
    ...(area ? [area] : []),
    ...(p.storey !== null
      ? [p.storeys !== null ? `${p.storey}/${p.storeys} поверх` : `${p.storey} поверх`]
      : []),
    ...(p.district ? [p.district] : p.locality ? [p.locality] : []),
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

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10 transition-shadow hover:ring-foreground/25 has-focus-visible:ring-3 has-focus-visible:ring-ring">
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
            className={cn("size-full object-cover", soldLabel && "opacity-60 grayscale")}
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <Building2 className="size-8" aria-hidden="true" />
            <span className="text-sm">Фото незабаром</span>
          </div>
        )}
        <span className="absolute top-3 left-3 max-w-[calc(100%-4.5rem)] truncate rounded-md bg-background/90 px-2 py-1 text-xs font-medium text-foreground">
          {soldLabel ?? `${DEAL_LABELS[property.deal]} · ${PROPERTY_TYPE_LABELS[property.property_type]}`}
        </span>
        <FavoriteButton propertyId={property.id} />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xl font-bold tabular-nums">{price}</p>
        <h3 className="line-clamp-2 text-base font-medium break-words" title={property.title}>
          <Link
            href={`/catalog/${property.slug}`}
            className="outline-none after:absolute after:inset-0 after:content-['']"
          >
            {property.title}
          </Link>
        </h3>
        {facts.length > 0 && (
          <p className="mt-auto pt-1 text-sm text-muted-foreground">{facts.join(" · ")}</p>
        )}
      </div>
    </article>
  );
};
