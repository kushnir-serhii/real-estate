import { Star } from "lucide-react";

import { SectionHeading } from "@/components/section-heading";
import { TESTIMONIALS } from "@/constants/home";
import { HomeSection } from "./home-section";

const STARS = [1, 2, 3, 4, 5] as const;

/** Three static review cards with a large dawn quote mark and an accessible star rating. */
export const Testimonials = () => (
  <HomeSection labelledBy="testimonials-title">
    <div className="flex flex-col gap-10">
      <div className="reveal">
        <SectionHeading id="testimonials-title" eyebrow={TESTIMONIALS.eyebrow} title={TESTIMONIALS.title} />
      </div>
      <ul className="reveal-stagger grid gap-4 md:grid-cols-3 lg:gap-6">
        {TESTIMONIALS.items.map((item) => (
          <li key={item.name}>
            <figure className="flex h-full flex-col gap-4 rounded-3xl bg-card p-6 text-card-foreground ring-1 ring-foreground/10 sm:p-8">
              <span aria-hidden="true" className="-mb-4 h-10 font-heading text-6xl leading-none text-dawn-text">
                &ldquo;
              </span>
              <div role="img" aria-label={`Оцінка ${item.rating} з 5`} className="flex gap-1 text-dawn-text">
                {STARS.slice(0, item.rating).map((n) => (
                  <Star key={n} aria-hidden="true" className="size-5 fill-current" />
                ))}
              </div>
              <blockquote className="flex-1">
                <p>{item.text}</p>
              </blockquote>
              <figcaption className="flex flex-col">
                <span className="font-semibold">{item.name}</span>
                <span className="text-sm text-muted-foreground">{item.deal}</span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </div>
  </HomeSection>
);
