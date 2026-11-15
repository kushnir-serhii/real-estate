import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ABOUT } from "@/constants/home";
import { Markdown } from "@/features/pages/markdown";
import { HomeSection } from "./home-section";

/** Left: CMS text and a link; right: two photos side by side, the second one offset down. Stacks on phones. */
export const HomeAbout = ({ body }: { body: string }) => (
  <HomeSection ariaLabel={ABOUT.eyebrow}>
    <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
      <div className="reveal flex flex-col items-start gap-6">
        <p className="eyebrow text-brand-text">{ABOUT.eyebrow}</p>
        <Markdown className="max-w-prose">{body}</Markdown>
        <Link href="/about" className={buttonVariants({ variant: "outline", size: "lg" })}>
          {ABOUT.action}
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Link>
      </div>
      <div className="grid grid-cols-5 gap-3 sm:gap-4">
        {/* eslint-disable @next/next/no-img-element -- static placeholders from public/; Workers has no image optimizer */}
        <img
          src={ABOUT.images.main.src}
          width={ABOUT.images.main.width}
          height={ABOUT.images.main.height}
          alt=""
          loading="lazy"
          decoding="async"
          className="reveal-curtain col-span-3 aspect-3/4 size-full object-cover"
        />
        <img
          src={ABOUT.images.secondary.src}
          width={ABOUT.images.secondary.width}
          height={ABOUT.images.secondary.height}
          alt=""
          loading="lazy"
          decoding="async"
          className="reveal-curtain col-span-2 mt-10 aspect-3/4 size-full object-cover sm:mt-16"
        />
        {/* eslint-enable @next/next/no-img-element */}
      </div>
    </div>
  </HomeSection>
);
