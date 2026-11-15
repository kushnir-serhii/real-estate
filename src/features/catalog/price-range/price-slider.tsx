"use client";

import { Slider } from "radix-ui";

import type { Currency, Positions } from "./price-range-math";
import { thumbValueText } from "./price-range-math";

type PriceSliderProps = {
  /** Number of bars; thumb positions are 0..bins. */
  bins: number;
  positions: Positions;
  onChange: (next: Positions) => void;
  /** Bounds the thumbs stand for, in `currency` (`undefined` = open), for `aria-valuetext`. */
  from: number | undefined;
  to: number | undefined;
  currency: Currency;
};

const THUMB_CLASS =
  "relative block size-6 rounded-full border-2 border-brand bg-background shadow-xs outline-none transition-shadow after:absolute after:-inset-2.5 after:content-[''] hover:ring-4 hover:ring-brand/20 focus-visible:ring-4 focus-visible:ring-ring/50";

/** Dual-thumb slider on bin edges; the thumb hit area is 44px. Arrows, Page Up / Down, Home / End work (Radix). */
export const PriceSlider = ({ bins, positions, onChange, from, to, currency }: PriceSliderProps) => (
  <Slider.Root
    value={[positions.lo, positions.hi]}
    min={0}
    max={bins}
    step={1}
    minStepsBetweenThumbs={1}
    onValueChange={([lo, hi]) => onChange({ lo, hi })}
    className="relative flex h-11 w-full touch-none items-center select-none"
  >
    <Slider.Track className="relative h-1 grow bg-border">
      <Slider.Range className="absolute h-full bg-brand" />
    </Slider.Track>
    <Slider.Thumb
      aria-label="Мінімальна ціна"
      aria-valuetext={thumbValueText(from, "lower", currency)}
      className={THUMB_CLASS}
    />
    <Slider.Thumb
      aria-label="Максимальна ціна"
      aria-valuetext={thumbValueText(to, "upper", currency)}
      className={THUMB_CLASS}
    />
  </Slider.Root>
);
