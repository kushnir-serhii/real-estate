import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ABOUT } from "@/constants/home";
import { Markdown } from "@/features/pages/markdown";
import { HomeSection } from "./home-section";

/** Left: CMS text and a link; right: an overlapping photo collage with a floating stat chip. Stacks on phones. */
export const HomeAbout = ({ body }: { body: string }) => (
  <HomeSection ariaLabel={ABOUT.eyebrow}>
    <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
      <div className="reveal flex flex-col items-start gap-6">
        <p className="eyebrow text-dawn-text">{ABOUT.eyebrow}</p>
        <Markdown className="max-w-prose">{body}</Markdown>
        <Link href="/about" className={buttonVariants({ variant: "outline", size: "lg" })}>
          {ABOUT.action}
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Link>
      </div>
      <div className="reveal relative pb-16 pl-6 sm:pl-10 lg:pb-20">
        {/* eslint-disable @next/next/no-img-element -- static placeholders from public/; Workers has no image optimizer */}
        <img
          src={ABOUT.images.main.src}
          width={ABOUT.images.main.width}
          height={ABOUT.images.main.height}
          alt=""
          loading="lazy"
          decoding="async"
          className="aspect-4/3 w-full rounded-2xl object-cover shadow-float"
        />
        <img
          src={ABOUT.images.secondary.src}
          width={ABOUT.images.secondary.width}
          height={ABOUT.images.secondary.height}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute bottom-0 left-0 aspect-square w-2/5 rounded-2xl object-cover shadow-float ring-4 ring-background"
        />
        <img
          src={ABOUT.images.tertiary.src}
          width={ABOUT.images.tertiary.width}
          height={ABOUT.images.tertiary.height}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute right-4 bottom-4 hidden aspect-4/3 w-1/3 rounded-2xl object-cover shadow-float ring-4 ring-background sm:block"
        />
        {/* eslint-enable @next/next/no-img-element */}
        <div className="absolute top-4 right-3 flex flex-col rounded-2xl bg-ink px-4 py-3 text-on-ink shadow-float sm:right-6">
          <span className="font-heading text-xl font-semibold tabular-nums">{ABOUT.chip.value}</span>
          <span className="text-xs text-ink-muted">{ABOUT.chip.label}</span>
        </div>
      </div>
    </div>
  </HomeSection>
);
