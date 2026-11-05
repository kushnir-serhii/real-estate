import { SectionHeading } from "@/components/section-heading";
import { BLOG_POST_PAGE } from "@/constants/blog";
import { PropertyCard } from "@/features/properties/property-card";
import type { PublishedProperty } from "@/lib/db/properties";

const RELATED_SIZES = "(min-width: 1152px) 22rem, (min-width: 640px) 50vw, 100vw";

/** «Об'єкти до статті»: hidden when the post has none. */
export const BlogRelated = ({ items }: { items: PublishedProperty[] }) => {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="blog-related-title" className="flex flex-col gap-8">
      <SectionHeading
        id="blog-related-title"
        eyebrow={BLOG_POST_PAGE.relatedEyebrow}
        title={BLOG_POST_PAGE.related}
        action={{ href: "/catalog", label: "Увесь каталог" }}
      />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {items.map((item) => (
          <li key={item.id}>
            <PropertyCard property={item} imageSizes={RELATED_SIZES} />
          </li>
        ))}
      </ul>
    </section>
  );
};
