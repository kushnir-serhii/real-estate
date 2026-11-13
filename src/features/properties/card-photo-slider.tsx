"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";

import { cn } from "@/lib/utils";

export type CardPhotoSlide = { src: string; srcSet?: string; width: number; height: number };

type CardPhotoSliderProps = {
  /** Photos in display order, already capped by the card. The first one is the only one in the server HTML. */
  slides: CardPhotoSlide[];
  /** `sizes` for the photos (how wide the card is in the layout). */
  sizes: string;
  /** First photo eager with high fetch priority (first row above the fold). */
  priority: boolean;
  /** Sold / rented: grey, muted photos. */
  muted: boolean;
};

// A horizontal swipe has to travel this far (px) and be clearly more horizontal than vertical.
const SWIPE_MIN = 40;

const BUTTON_CLASS =
  "nojs-hide absolute top-1/2 z-10 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-control bg-background/75 text-foreground ring-1 ring-foreground/10 outline-none backdrop-blur transition-[opacity,background-color] duration-(--duration-fast) hover:bg-background/95 focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring group-focus-within:opacity-100 group-hover:opacity-100 pointer-fine:opacity-0 motion-reduce:transition-none";

/**
 * Photos of a property card with prev / next buttons, a counter and swipe. Loops. Only the first photo renders until
 * the visitor shows interest in the card (mouse over it, focus inside it, a touch on the photo); then the photos next
 * to the current one mount, so the next one is usually loaded before it is shown.
 * Lives inside the card's photo box (relative, 4:3). The buttons sit above the card's stretched link (z-10).
 */
export const CardPhotoSlider = ({ slides, sizes, priority, muted }: CardPhotoSliderProps) => {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [engaged, setEngaged] = useState(false);
  const [visited, setVisited] = useState<readonly number[]>([0]);
  const [announcement, setAnnouncement] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const go = (step: 1 | -1) => {
    const next = (index + step + count) % count;
    setEngaged(true);
    setIndex(next);
    setVisited((v) => (v.includes(next) ? v : [...v, next]));
    setAnnouncement(`Фото ${next + 1} з ${count}`);
  };
  // The swipe listener lives in an effect: keep it calling the latest `go` without re-subscribing.
  const goRef = useRef(go);
  useEffect(() => {
    goRef.current = go;
  });

  useEffect(() => {
    const root = rootRef.current;
    const card = root?.closest("article");
    if (!root || !card || count < 2) return;
    const engage = () => setEngaged(true);
    const onPointerEnter = (e: PointerEvent) => {
      if (e.pointerType === "mouse") engage();
    };
    // The card's stretched link covers the photo, so touches land on the link: listen on the card and check
    // that the touch started on the photo.
    let start: { x: number; y: number } | null = null;
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      const box = root.getBoundingClientRect();
      if (e.touches.length !== 1 || !t || t.clientY < box.top || t.clientY > box.bottom) {
        start = null;
        return;
      }
      start = { x: t.clientX, y: t.clientY };
      engage();
    };
    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (!start || !t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      start = null;
      if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.5) goRef.current(dx < 0 ? 1 : -1);
    };
    card.addEventListener("pointerenter", onPointerEnter);
    card.addEventListener("focusin", engage);
    card.addEventListener("touchstart", onTouchStart, { passive: true });
    card.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      card.removeEventListener("pointerenter", onPointerEnter);
      card.removeEventListener("focusin", engage);
      card.removeEventListener("touchstart", onTouchStart);
      card.removeEventListener("touchend", onTouchEnd);
    };
  }, [count]);

  // Mounted: the first photo always; after engagement also every photo next to one already shown.
  const isNear = (i: number) =>
    visited.some((v) => {
      const d = Math.abs(v - i);
      return Math.min(d, count - d) <= 1;
    });

  const onButton = (step: 1 | -1) => (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    go(step);
  };

  return (
    <div ref={rootRef} className="absolute inset-0">
      <div
        className={cn(
          "relative size-full transition-transform duration-(--duration-slow) ease-(--ease-out-soft) group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100",
          muted && "opacity-60 grayscale",
        )}
      >
        {slides.map((slide, i) =>
          i === 0 || (engaged && isNear(i)) ? (
            // eslint-disable-next-line @next/next/no-img-element -- photos come from R2/public; Workers has no image optimizer
            <img
              key={slide.src}
              src={slide.src}
              srcSet={slide.srcSet}
              sizes={slide.srcSet ? sizes : undefined}
              alt=""
              width={slide.width}
              height={slide.height}
              loading={i === 0 && priority ? "eager" : "lazy"}
              fetchPriority={i === 0 && priority ? "high" : undefined}
              decoding="async"
              className={cn(
                "absolute inset-0 size-full object-cover transition-opacity duration-(--duration-base) ease-(--ease-out-soft) motion-reduce:transition-none",
                i === index ? "opacity-100" : "opacity-0",
              )}
            />
          ) : null,
        )}
      </div>
      {count > 1 && (
        <>
          <button type="button" aria-label="Попереднє фото" onClick={onButton(-1)} className={cn(BUTTON_CLASS, "left-2")}>
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button type="button" aria-label="Наступне фото" onClick={onButton(1)} className={cn(BUTTON_CLASS, "right-2")}>
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 bottom-3 z-10 rounded-control bg-background/80 px-2 py-0.5 text-xs font-semibold text-foreground tabular-nums backdrop-blur"
          >
            {index + 1} / {count}
          </span>
          <span role="status" className="sr-only">
            {announcement}
          </span>
        </>
      )}
    </div>
  );
};
