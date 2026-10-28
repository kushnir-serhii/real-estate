import { Building2 } from "lucide-react";
import Link from "next/link";

import type { PublishedProperty } from "@/lib/db/properties";
import { formatPrice } from "@/lib/format/format-price";
import { photoUrl } from "@/lib/photos/photo-url";
import { DEAL_LABELS, PROPERTY_TYPE_LABELS } from "./property-labels";

type PropertyCardProps = { property: PublishedProperty };

// Fallback intrinsic size when a photo has no stored dimensions; the box is a fixed 4:3 anyway.
const FALLBACK_WIDTH = 640;
const FALLBACK_HEIGHT = 480;

const buildFacts = (p: PublishedProperty): string[] => [
  ...(p.room_count !== null ? [`${p.room_count} кімн.`] : []),
  ...(p.area_total !== null ? [`${p.area_total} м²`] : []),
  ...(p.storey !== null
    ? [p.storeys !== null ? `${p.storey}/${p.storeys} поверх` : `${p.storey} поверх`]
    : []),
  ...(p.district ? [p.district] : []),
];

export const PropertyCard = ({ property }: PropertyCardProps) => {
  const photo = property.property_photos[0];
  const facts = buildFacts(property);
  // Missing currency on a priced row is a data gap: treat it as price on request.
  const price =
    property.price_amount !== null && property.currency !== null
      ? formatPrice(property.price_amount, property.currency, property.deal)
      : formatPrice(null, "USD");

  return (
    <Link
      href={`/catalog/${property.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10 outline-none transition-shadow hover:ring-foreground/25 focus-visible:ring-3 focus-visible:ring-ring"
    >
      <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- photos come from R2/public; Workers has no image optimizer
          <img
            src={photoUrl(photo.r2_key)}
            alt={property.title}
            width={photo.width ?? FALLBACK_WIDTH}
            height={photo.height ?? FALLBACK_HEIGHT}
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <Building2 className="size-8" aria-hidden="true" />
            <span className="text-sm">Фото незабаром</span>
          </div>
        )}
        <span className="absolute top-3 left-3 rounded-md bg-background/90 px-2 py-1 text-xs font-medium text-foreground">
          {DEAL_LABELS[property.deal]} · {PROPERTY_TYPE_LABELS[property.property_type]}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xl font-bold tabular-nums">{price}</p>
        <h3 className="line-clamp-2 text-base font-medium break-words" title={property.title}>
          {property.title}
        </h3>
        {facts.length > 0 && (
          <p className="mt-auto pt-1 text-sm text-muted-foreground">{facts.join(" · ")}</p>
        )}
      </div>
    </Link>
  );
};
