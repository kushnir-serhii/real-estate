"use client";

import { Building2, ChevronLeft, ChevronRight, Expand, XIcon } from "lucide-react";
import { Dialog } from "radix-ui";
import { useRef, useState } from "react";
import type { KeyboardEvent, RefObject, UIEvent } from "react";

import { cn } from "@/lib/utils";

/** A photo ready to render: URLs resolved on the server, intrinsic size known. */
export type GalleryPhoto = {
  id: string;
  src: string;
  srcSet?: string;
  width: number;
  height: number;
};

type PropertyGalleryProps = {
  photos: GalleryPhoto[];
  /** Property title, names the carousel and the fullscreen dialog. */
  title: string;
};

// The main strip is full width on phones and the left column (max ~46rem) on desktop.
const STRIP_SIZES = "(min-width: 1152px) 46rem, (min-width: 1024px) 60vw, 100vw";

const ROUND_BUTTON =
  "inline-flex size-11 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring disabled:opacity-40";

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const scrollToIndex = (strip: HTMLElement | null, index: number, smooth: boolean) => {
  strip?.scrollTo({
    left: index * strip.clientWidth,
    behavior: smooth && !prefersReducedMotion() ? "smooth" : "auto",
  });
};

/** Index of the slide that fills the strip now (each slide is exactly the strip's width). */
const visibleIndex = (strip: HTMLElement, count: number) =>
  Math.min(count - 1, Math.max(0, Math.round(strip.scrollLeft / Math.max(1, strip.clientWidth))));

/** ←/→ move between slides (wrapping); other keys pass through. */
const arrowStep = (event: KeyboardEvent): -1 | 1 | null => {
  if (event.altKey || event.ctrlKey || event.metaKey) return null;
  if (event.key === "ArrowLeft") return -1;
  if (event.key === "ArrowRight") return 1;
  return null;
};

const wrap = (index: number, count: number) => (index + count) % count;

/**
 * Scroll-snap strip state: the visible index plus the pending target of a smooth scroll,
 * so quick repeated arrow presses step from where the strip is heading, not where it is.
 */
const useStrip = (count: number, initial: number, onChange?: (index: number) => void) => {
  const stripRef = useRef<HTMLUListElement>(null);
  const targetRef = useRef<number | null>(null);
  const [index, setIndex] = useState(initial);

  const go = (target: number, smooth = true) => {
    const next = wrap(target, count);
    targetRef.current = next;
    scrollToIndex(stripRef.current, next, smooth);
  };
  const step = (delta: -1 | 1) => go((targetRef.current ?? index) + delta);
  const onScroll = (event: UIEvent<HTMLElement>) => {
    const next = visibleIndex(event.currentTarget, count);
    if (next === targetRef.current) targetRef.current = null;
    setIndex(next);
    onChange?.(next);
  };
  // A swipe takes over from any pending button/keyboard scroll.
  const onTouchStart = () => {
    targetRef.current = null;
  };

  return { stripRef, index, go, step, onScroll, onTouchStart };
};

export const PropertyGallery = ({ photos, title }: PropertyGalleryProps) => {
  const regionRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const viewerIndexRef = useRef(0);
  const [viewer, setViewer] = useState<{ open: false } | { open: true; start: number }>({ open: false });
  const count = photos.length;
  const { stripRef, index, go, step: stepBy, onScroll, onTouchStart } = useStrip(count, 0);

  if (count === 0) {
    return (
      <div className="-mx-4 flex aspect-4/3 flex-col items-center justify-center gap-2 bg-muted text-muted-foreground sm:mx-0 sm:aspect-3/2 sm:rounded-xl">
        <Building2 className="size-10" aria-hidden="true" />
        <p className="text-base">Фото незабаром</p>
      </div>
    );
  }

  const many = count > 1;

  const onKeyDown = (event: KeyboardEvent) => {
    const step = arrowStep(event);
    if (step === null || !many) return;
    event.preventDefault();
    stepBy(step);
  };

  const openViewer = (at: number) => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    viewerIndexRef.current = at;
    setViewer({ open: true, start: at });
  };

  // Radix returns focus to a Dialog.Trigger only; the viewer opens from several places, so do it here.
  const restoreAfterViewer = () => {
    go(viewerIndexRef.current, false);
    const opener = openerRef.current;
    if (opener?.isConnected && opener.tabIndex >= 0) opener.focus();
    else regionRef.current?.focus();
  };

  return (
    <div
      ref={regionRef}
      role="region"
      aria-roledescription="карусель"
      aria-label={`Фото: ${title}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="group/gallery relative -mx-4 outline-none focus-visible:ring-3 focus-visible:ring-ring sm:mx-0 sm:rounded-xl"
    >
      <ul
        ref={stripRef}
        onScroll={onScroll}
        onTouchStart={onTouchStart}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain bg-muted scrollbar-none sm:rounded-xl"
      >
        {photos.map((photo, i) => (
          <li
            key={photo.id}
            role="group"
            aria-roledescription="слайд"
            aria-label={`${i + 1} з ${count}`}
            className="aspect-4/3 w-full shrink-0 snap-start snap-always sm:aspect-3/2"
          >
            {/* Click/tap opens the viewer; keyboard users have the «На весь екран» button. */}
            <button
              type="button"
              tabIndex={-1}
              aria-label={`Відкрити фото ${i + 1} на весь екран`}
              onClick={() => openViewer(i)}
              className="block size-full cursor-zoom-in"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- photos come from R2/public; Workers has no image optimizer */}
              <img
                src={photo.src}
                srcSet={photo.srcSet}
                sizes={photo.srcSet ? STRIP_SIZES : undefined}
                alt=""
                width={photo.width}
                height={photo.height}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : undefined}
                decoding="async"
                draggable={false}
                className="size-full object-cover"
              />
            </button>
          </li>
        ))}
      </ul>

      {many && (
        <>
          <button
            type="button"
            aria-label="Попереднє фото"
            onClick={() => stepBy(-1)}
            className={cn(ROUND_BUTTON, "absolute top-1/2 left-3 -translate-y-1/2 bg-background/90 text-foreground shadow-sm hover:bg-background")}
          >
            <ChevronLeft className="size-6" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Наступне фото"
            onClick={() => stepBy(1)}
            className={cn(ROUND_BUTTON, "absolute top-1/2 right-3 -translate-y-1/2 bg-background/90 text-foreground shadow-sm hover:bg-background")}
          >
            <ChevronRight className="size-6" aria-hidden="true" />
          </button>
          <p
            aria-live="polite"
            aria-atomic="true"
            className="absolute bottom-3 left-3 rounded-md bg-scrim px-2 py-1 text-sm font-medium text-on-scrim tabular-nums"
          >
            <span className="sr-only">Фото </span>
            {index + 1} / {count}
          </p>
        </>
      )}
      <button
        type="button"
        onClick={() => openViewer(index)}
        className={cn(ROUND_BUTTON, "absolute right-3 bottom-3 bg-scrim text-on-scrim hover:bg-viewer")}
        aria-label="На весь екран"
      >
        <Expand className="size-5" aria-hidden="true" />
      </button>

      <Dialog.Root open={viewer.open} onOpenChange={(open) => !open && setViewer({ open: false })}>
        <Dialog.Portal>
          {viewer.open && (
            <GalleryViewer
              photos={photos}
              title={title}
              start={viewer.start}
              indexRef={viewerIndexRef}
              onClosed={restoreAfterViewer}
            />
          )}
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

type GalleryViewerProps = {
  photos: GalleryPhoto[];
  title: string;
  start: number;
  /** Shared with the main strip, so it can scroll to the last viewed photo on close. */
  indexRef: RefObject<number>;
  onClosed: () => void;
};

/** Fullscreen viewer; mounted only while the dialog is open, so its state starts fresh each time. */
const GalleryViewer = ({ photos, title, start, indexRef, onClosed }: GalleryViewerProps) => {
  const count = photos.length;
  const many = count > 1;
  const { stripRef, index, step: stepBy, onScroll, onTouchStart } = useStrip(count, start, (next) => {
    indexRef.current = next;
  });

  const onKeyDown = (event: KeyboardEvent) => {
    const step = arrowStep(event);
    if (step === null || !many) return;
    event.preventDefault();
    stepBy(step);
  };

  return (
    <>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-viewer" />
      <Dialog.Content
        aria-describedby={undefined}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          scrollToIndex(stripRef.current, start, false);
          stripRef.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onClosed();
        }}
        onKeyDown={onKeyDown}
        className="fixed inset-0 z-50 flex flex-col bg-viewer text-on-scrim outline-none"
      >
        <div className="flex items-center justify-between gap-2 px-2 pt-[env(safe-area-inset-top)] sm:px-4">
          <Dialog.Title className="min-w-0 truncate py-3 pl-2 text-sm font-medium sm:text-base">
            {many ? (
              <span className="tabular-nums">
                <span className="sr-only">Фото </span>
                {index + 1} / {count}
                <span className="sr-only">: {title}</span>
              </span>
            ) : (
              title
            )}
          </Dialog.Title>
          <Dialog.Close className={cn(ROUND_BUTTON, "shrink-0 hover:bg-on-scrim/15")} aria-label="Закрити">
            <XIcon className="size-6" aria-hidden="true" />
          </Dialog.Close>
        </div>

        <div className="relative min-h-0 flex-1">
          <ul
            ref={stripRef}
            tabIndex={-1}
            aria-label={`Фото: ${title}`}
            onScroll={onScroll}
            onTouchStart={onTouchStart}
            className="flex size-full snap-x snap-mandatory overflow-x-auto overscroll-contain outline-none scrollbar-none"
          >
            {photos.map((photo, i) => (
              <li
                key={photo.id}
                aria-label={`${i + 1} з ${count}`}
                className="flex size-full shrink-0 snap-center snap-always items-center justify-center p-2 sm:px-20 sm:py-4"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- photos come from R2/public; Workers has no image optimizer */}
                <img
                  src={photo.src}
                  srcSet={photo.srcSet}
                  sizes={photo.srcSet ? "100vw" : undefined}
                  alt=""
                  width={photo.width}
                  height={photo.height}
                  loading={Math.abs(i - start) <= 1 ? "eager" : "lazy"}
                  decoding="async"
                  draggable={false}
                  className="h-auto max-h-full w-auto max-w-full object-contain"
                />
              </li>
            ))}
          </ul>

          {many && (
            <>
              <button
                type="button"
                aria-label="Попереднє фото"
                onClick={() => stepBy(-1)}
                className={cn(ROUND_BUTTON, "absolute top-1/2 left-2 -translate-y-1/2 bg-scrim hover:bg-on-scrim/15 sm:left-4")}
              >
                <ChevronLeft className="size-7" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Наступне фото"
                onClick={() => stepBy(1)}
                className={cn(ROUND_BUTTON, "absolute top-1/2 right-2 -translate-y-1/2 bg-scrim hover:bg-on-scrim/15 sm:right-4")}
              >
                <ChevronRight className="size-7" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
        <div className="pb-[env(safe-area-inset-bottom)]" />
      </Dialog.Content>
    </>
  );
};
