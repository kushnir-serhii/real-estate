import { cva, type VariantProps } from "class-variance-authority";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const carouselArrowVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-full outline-none transition-[opacity,background-color] duration-(--duration-fast) focus-visible:ring-3 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none",
  {
    variants: {
      // Every size keeps the 44px minimum hit area.
      size: {
        sm: "size-11 [&_svg]:size-5",
        md: "size-12 [&_svg]:size-6",
        lg: "size-14 [&_svg]:size-7",
      },
      // light: over photos and the page; dark: on the fullscreen viewer.
      tone: {
        light: "bg-background/75 text-foreground ring-1 ring-foreground/10 backdrop-blur hover:bg-background/95",
        dark: "bg-scrim text-on-scrim hover:bg-on-scrim/15",
      },
    },
    defaultVariants: { size: "md", tone: "light" },
  },
);

type CarouselArrowProps = Omit<ComponentProps<"button">, "children"> &
  VariantProps<typeof carouselArrowVariants> & {
    direction: "prev" | "next";
  };

/** The one prev / next button of every carousel. Position it with `className`; `aria-label` defaults to Ukrainian. */
export const CarouselArrow = ({ direction, size, tone, className, type = "button", ...props }: CarouselArrowProps) => {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type={type}
      aria-label={direction === "prev" ? "Попереднє фото" : "Наступне фото"}
      className={cn(carouselArrowVariants({ size, tone }), className)}
      {...props}
    >
      <Icon aria-hidden="true" />
    </button>
  );
};
