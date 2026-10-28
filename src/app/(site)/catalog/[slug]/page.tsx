import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { metaDescription } from "@/features/property/property-details";
import { PropertyView } from "@/features/property/property-view";
import { getPropertyBySlug } from "@/lib/db/properties";
import { largestPhotoUrl } from "@/lib/photos/photo-src-set";

type PropertyPageProps = { params: Promise<{ slug: string }> };

// No paths at build time: each property renders on its first visit and stays cached (ISR),
// invalidated by the `properties` / `property:<slug>` tags after sync or admin edits.
export const generateStaticParams = async (): Promise<{ slug: string }[]> => [];

export const generateMetadata = async ({ params }: PropertyPageProps): Promise<Metadata> => {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);
  if (!property) notFound();

  const canonical = `/catalog/${property.slug}`;
  const description = metaDescription(property);
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
  const property = await getPropertyBySlug(slug);
  // Spec 005 slice 3: a recently hidden property branches here to the «sold» view; unknown → custom 404.
  if (!property) notFound();
  return <PropertyView property={property} />;
};

export default PropertyPage;
