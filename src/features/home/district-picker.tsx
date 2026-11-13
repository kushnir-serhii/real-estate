import Link from "next/link";

import { SectionHeading } from "@/components/section-heading";
import { DISTRICT_PICKER } from "@/constants/home";
import { cn } from "@/lib/utils";

const ROOT = "district-picker";
const ACTIVE = ":is(:hover,:focus-visible)";

/**
 * CSS only (works without JS). The default district's pill (index 0, whose photo shows at rest) is active while no
 * pill is hovered or focused, so the photo and an active pill always match; then the hovered / focused pill alone is
 * active (its own hover: / focus-visible: utilities). Colours are theme tokens only.
 * Photo swap: while a district link is hovered or keyboard-focused, every photo hides and that district's photo
 * shows. Desktop only (below lg there is one static header photo, the default one). Unlayered, so it beats the
 * opacity utilities; the per-item rules come last, so they win over the "hide all" one at equal specificity.
 */
const SWAP_CSS = `.${ROOT}:not(:has([data-district]${ACTIVE})) [data-district="0"] {
  border-color: var(--primary); background-color: var(--primary); color: var(--primary-foreground);
}
@media (width >= 64rem) {
.${ROOT}:has([data-district]${ACTIVE}) [data-district-photo] { opacity: 0; }
${DISTRICT_PICKER.items
  .map((_, i) => `.${ROOT}:has([data-district="${i}"]${ACTIVE}) [data-district-photo="${i}"] { opacity: 1; }`)
  .join("\n")}
}`;

const districtHref = (name: string) => `/catalog?district=${encodeURIComponent(name)}`;

/**
 * «Райони Києва»: a grid of pill links to the catalog filtered by district. On desktop a large photo on the right
 * fades into the page and crossfades to the hovered / focused district's photo. Phones: one header photo, no swap.
 */
export const DistrictPicker = () => {
  const [first] = DISTRICT_PICKER.items;

  return (
    <section aria-labelledby="district-picker-title" className={cn(ROOT, "relative isolate overflow-hidden py-12 sm:py-16 lg:py-24")}>
      <style dangerouslySetInnerHTML={{ __html: SWAP_CSS }} />

      {/* Desktop: stacked photos on the right half, faded into the page. display:none below lg, so the lazy
          images aren't fetched on phones. */}
      <div aria-hidden="true" className="absolute inset-y-0 right-0 -z-10 hidden w-3/5 lg:block">
        {DISTRICT_PICKER.items.map((item, index) => (
          // eslint-disable-next-line @next/next/no-img-element -- static placeholders from public/; Workers has no image optimizer
          <img
            key={item.name}
            data-district-photo={index}
            src={item.image.src}
            alt=""
            width={item.image.width}
            height={item.image.height}
            loading="lazy"
            decoding="async"
            className={cn(
              "absolute inset-0 size-full object-cover transition-opacity duration-(--duration-slow) ease-out-soft motion-reduce:transition-none",
              index === 0 ? "opacity-100" : "opacity-0",
            )}
          />
        ))}
        <span className="district-photo-fade absolute inset-0" />
      </div>

      <div className="site-container">
        <div className="flex flex-col gap-6 sm:gap-8 lg:min-h-112 lg:justify-between lg:gap-16">
          <div className="reveal lg:max-w-md">
            <SectionHeading
              id="district-picker-title"
              eyebrow={DISTRICT_PICKER.eyebrow}
              title={DISTRICT_PICKER.title}
              description={DISTRICT_PICKER.description}
            />
          </div>

          {/* Phones and tablets: the default photo as a header image */}
          {/* eslint-disable-next-line @next/next/no-img-element -- static placeholder from public/; Workers has no image optimizer */}
          <img
            src={first.image.src}
            alt=""
            width={first.image.width}
            height={first.image.height}
            loading="lazy"
            decoding="async"
            className="aspect-3/2 w-full rounded-3xl bg-muted object-cover sm:aspect-21/9 lg:hidden"
          />

          <ul className="reveal-stagger grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-5 lg:max-w-5xl">
            {DISTRICT_PICKER.items.map((item, index) => (
              <li key={item.name} className="flex">
                <Link
                  href={districtHref(item.name)}
                  data-district={index}
                  className="flex min-h-11 w-full items-center justify-center rounded-control border border-border bg-card px-4 py-2.5 text-center font-medium text-card-foreground shadow-sm outline-none transition-colors duration-(--duration-base) ease-out-soft wrap-break-word hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:border-primary focus-visible:bg-primary focus-visible:text-primary-foreground focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none lg:min-h-14 lg:text-lg"
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
