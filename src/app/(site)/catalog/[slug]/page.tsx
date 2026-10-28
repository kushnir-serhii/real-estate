import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { metaDescription } from "@/features/property/property-details";
import { PropertyView } from "@/features/property/property-view";
import { SoldPropertyView } from "@/features/property/sold-property-view";
import { soldStatusLabel } from "@/features/property/sold-status-label";
import { getPropertyBySlug } from "@/lib/db/properties";
import { largestPhotoUrl } from "@/lib/photos/photo-src-set";

type PropertyPageProps = { params: Promise<{ slug: string }> };

// No paths at build time: each property renders on its first visit and stays cached (ISR),
// invalidated by the `properties` / `property:<slug>` tags after sync or admin edits.
export const generateStaticParams = async (): Promise<{ slug: string }[]> => [];

// At most hourly, so a «sold» page turns into the 404 within an hour of its 7-day window ending.
export const revalidate = 3600;

export const generateMetadata = async ({ params }: PropertyPageProps): Promise<Metadata> => {
  const { slug } = await params;
  const result = await getPropertyBySlug(slug);
  if (!result) notFound();
  const { property } = result;

  const canonical = `/catalog/${property.slug}`;
  const description = metaDescription(property);

  if (result.kind === "sold") {
    return {
      title: `${soldStatusLabel(property.deal)}: ${property.title}`,
      description,
      alternates: { canonical },
      robots: { index: false, follow: true },
    };
  }

  const photo = property.property_photos[0];
  const images = photo
    ? [
        {
          url: largestPhotoUrl(photo),
          ...(photo.width && photo.height && !photo.sizes ? { width: photo.width, height: photo.height } : {}),
        },
      ]
    : undefined;
  // A custom SEO title already carries the brand: don't run it through the title template.
  const title = property.seo_title?.trim() ? { absolute: property.seo_title.trim() } : property.title;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: "website", url: canonical, title: property.seo_title?.trim() || property.title, description, images },
  };
};

const PropertyPage = async ({ params }: PropertyPageProps) => {
  const { slug } = await params;
  const result = await getPropertyBySlug(slug);
  if (!result) notFound();
  switch (result.kind) {
    case "published":
      return <PropertyView property={result.property} />;
    case "sold":
      return <SoldPropertyView property={result.property} />;
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
};

export default PropertyPage;
