import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { SectionHeading } from "@/components/section-heading";
import { DISTRICTS } from "@/constants/home";
import { cn } from "@/lib/utils";
import { HomeSection } from "./home-section";

/** Desktop bento: tile spans per item (one 2x2 hero tile, wide ones, the rest single). Phones use a snap strip. */
const SPANS = ["lg:col-span-2 lg:row-span-2", "lg:col-span-2", "", "", "lg:col-span-2", "lg:col-span-2"] as const;

/** District tiles: a bento on desktop, a horizontal scroll-snap strip on phones (scrolls inside itself). */
export const Districts = () => (
  <HomeSection labelledBy="districts-title">
    <div className="flex flex-col gap-8">
      <div className="reveal">
        <SectionHeading
          id="districts-title"
          eyebrow={DISTRICTS.eyebrow}
          title={DISTRICTS.title}
          description={DISTRICTS.description}
        />
      </div>
      <ul className="reveal-stagger -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:auto-rows-56 lg:grid-cols-4 lg:gap-4 lg:overflow-visible lg:px-0 lg:pb-0">
        {DISTRICTS.items.map((district, index) => (
          <li key={district.name} className={cn("w-64 shrink-0 snap-start lg:w-auto", SPANS[index])}>
            <Link
              href={`/catalog?district=${encodeURIComponent(district.name)}`}
              className="group/tile relative isolate flex aspect-4/5 h-full w-full flex-col justify-end overflow-hidden rounded-3xl bg-ink p-5 text-on-scrim outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:aspect-auto lg:p-6"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static placeholders from public/; Workers has no image optimizer */}
              <img
                src={district.image.src}
                alt=""
                width={district.image.width}
                height={district.image.height}
                loading="lazy"
                className="absolute inset-0 -z-20 size-full object-cover transition-transform duration-(--duration-slow) ease-(--ease-out-soft) group-hover/tile:scale-105 motion-reduce:transition-none motion-reduce:group-hover/tile:scale-100"
              />
              <span aria-hidden="true" className="tile-veil absolute inset-0 -z-10" />
              <span className="flex items-end justify-between gap-3">
                <span className="flex min-w-0 flex-col gap-1">
                  <h3 className={cn("font-heading font-semibold break-words", index === 0 ? "text-h3" : "text-lg")}>
                    {district.name}
                  </h3>
                  <span className="text-sm">{district.tagline}</span>
                </span>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-dawn text-dawn-foreground transition-transform duration-(--duration-base) ease-(--ease-out-soft) group-hover/tile:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover/tile:translate-x-0">
                  <ArrowRight className="size-5" aria-hidden="true" />
                  <span className="sr-only">{DISTRICTS.cta}</span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  </HomeSection>
);
