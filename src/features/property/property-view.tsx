import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { JsonLd } from "@/components/seo/json-ld";
import { buttonVariants } from "@/components/ui/button";
import { FavoriteButton } from "@/features/favorites/favorite-button";
import { PropertyRequestForm } from "@/features/leads/property-request-form";
import { breadcrumbSchema, CATALOG_CRUMB, HOME_CRUMB, propertySchema } from "@/features/seo/schemas";
import { getSiteUrl } from "@/lib/site-url";
import { DEAL_LABELS, PROPERTY_TYPE_LABELS } from "@/features/properties/property-labels";
import type { PublishedProperty } from "@/lib/db/properties";
import { largestPhotoUrl, photoSrcSet } from "@/lib/photos/photo-src-set";
import { photoUrl } from "@/lib/photos/photo-url";
import { cn } from "@/lib/utils";
import { PropertyContactCard } from "./property-contact-card";
import {
  contactPhone,
  factRows,
  locationText,
  perSquareMeterText,
  priceText,
  REQUEST_ANCHOR,
  shortFacts,
} from "./property-details";
import { PropertyDescription } from "./property-description";
import { PropertyFacts } from "./property-facts";
import { PropertyGallery } from "./property-gallery";
import type { GalleryPhoto } from "./property-gallery";
import { PropertyLocation } from "./property-location";
import { PropertyMobileBar } from "./property-mobile-bar";
import { PropertyPrice } from "./property-price";
import { SimilarProperties } from "./similar-properties";

type PropertyViewProps = { property: PublishedProperty };

// Fallback intrinsic size when a photo has no stored dimensions; the gallery box has a fixed ratio anyway.
const FALLBACK_WIDTH = 1280;
const FALLBACK_HEIGHT = 960;

const toGalleryPhotos = (property: PublishedProperty): GalleryPhoto[] =>
  property.property_photos.map((photo) => ({
    id: photo.id,
    src: photoUrl(photo.r2_key),
    srcSet: photoSrcSet(photo.sizes),
    width: photo.width ?? FALLBACK_WIDTH,
    height: photo.height ?? FALLBACK_HEIGHT,
  }));

// both or nothing: a half-filled pair is treated as no coordinates
const mapCoordinates = ({ lat, lng }: PublishedProperty) => (lat !== null && lng !== null ? { lat, lng } : null);

/** Page of a published property. Spec 005 slice 3 adds a separate «sold» view next to this one. */
export const PropertyView = ({ property }: PropertyViewProps) => {
  const price = priceText(property);
  const perSquareMeter = perSquareMeterText(property);
  const facts = shortFacts(property);
  const location = locationText(property);
  const siteUrl = getSiteUrl();
  const listing = propertySchema(
    siteUrl,
    property,
    property.property_photos.map((photo) => largestPhotoUrl(photo)),
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-2 sm:pt-4 lg:pb-16">
      <JsonLd
        data={breadcrumbSchema(siteUrl, [
          HOME_CRUMB,
          CATALOG_CRUMB,
          { name: property.title, path: `/catalog/${property.slug}` },
        ])}
      />
      {listing ? <JsonLd data={listing} /> : null}
      <Link
        href={`/catalog?deal=${property.deal}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        До каталогу
      </Link>

      <div className="mt-2 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-10">
        <div className="flex min-w-0 flex-col gap-8">
          <PropertyGallery photos={toGalleryPhotos(property)} title={property.title} />

          <header className="flex flex-col gap-2">
            <p className="text-sm font-medium text-muted-foreground">
              {DEAL_LABELS[property.deal]} · {PROPERTY_TYPE_LABELS[property.property_type]}
            </p>
            <h1 className="text-2xl font-bold break-words text-balance sm:text-3xl">{property.title}</h1>
            {location && <p className="break-words text-muted-foreground">{location}</p>}
            <PropertyPrice
              price={price}
              perSquareMeter={perSquareMeter}
              facts={facts}
              action={<FavoriteButton propertyId={property.id} variant="page" />}
              className="mt-2 lg:hidden"
            />
          </header>

          <PropertyFacts rows={factRows(property)} />
          <PropertyDescription text={property.description} />
          <PropertyLocation text={location} coordinates={mapCoordinates(property)} />
        </div>

        <aside aria-label="Ціна, заявка та контакти" className="mt-8 flex flex-col gap-4 lg:mt-0">
          <div className="hidden rounded-xl bg-card p-5 text-card-foreground ring-1 ring-foreground/10 lg:block">
            <PropertyPrice
              price={price}
              perSquareMeter={perSquareMeter}
              facts={facts}
              action={<FavoriteButton propertyId={property.id} variant="page" />}
            />
            <a href={`#${REQUEST_ANCHOR}`} className={cn(buttonVariants({ size: "lg" }), "mt-5 w-full")}>
              Залишити заявку
            </a>
          </div>
          <section
            id={REQUEST_ANCHOR}
            className="scroll-mt-24 rounded-xl bg-card p-5 text-card-foreground ring-1 ring-foreground/10"
          >
            <PropertyRequestForm propertyId={property.id} />
          </section>
          <PropertyContactCard agent={property.agent} />
        </aside>
      </div>

      <Suspense fallback={null}>
        <SimilarProperties property={property} className="mt-12" />
      </Suspense>

      <PropertyMobileBar phone={contactPhone(property)} />
    </div>
  );
};
