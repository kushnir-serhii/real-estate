"use client";

import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format/format-price";
import { cn } from "@/lib/utils";
import { objectsLabel } from "../objects-label";
import { CountTween } from "./count-tween";
import { PriceFields } from "./price-fields";
import { PriceChartSkeleton } from "./price-chart-skeleton";
import { PriceHistogramChart } from "./price-histogram-chart";
import { PriceSlider } from "./price-slider";
import {
  countInRange,
  currencyToUsd,
  niceAmount,
  positionsFor,
  valueAtPosition,
} from "./price-range-math";
import type { Positions, PriceValue } from "./price-range-math";
import { usePriceHistogram } from "./use-price-histogram";

type PriceRangePanelProps = {
  /** Other filters of the form as a query string (deal, type, rooms…); the histogram is built for them. */
  query: string;
  value: PriceValue;
  onChange: (next: PriceValue) => void;
  /** Popover / sheet: «Скинути» and «Показати N». Inline (catalog): the form has its own buttons, the count is a line. */
  onSubmit?: () => void;
  /** Hide the «Ціна» heading when the host (a sheet) already has one. */
  showTitle?: boolean;
  /** Catalog: without a deal, sale and rent prices would share one chart, so show plain fields and a hint. */
  requireDeal?: boolean;
};

/** Histogram + slider + fields + live count. Loaded lazily (Radix Slider, fetch): not part of the first-load JS. */
export const PriceRangePanel = ({
  query,
  value,
  onChange,
  onSubmit,
  showTitle = true,
  requireDeal = false,
}: PriceRangePanelProps) => {
  const noDeal = requireDeal && !new URLSearchParams(query).get("deal");
  const { data, status, retry } = usePriceHistogram(noDeal ? null : query);
  const showActions = onSubmit !== undefined;

  if (noDeal) {
    return (
      <div className="flex flex-col gap-3">
        <PriceFields value={value} onChange={onChange} />
        <p className="text-sm text-muted-foreground">
          Оберіть, що потрібно (купити чи орендувати), щоб побачити розподіл цін.
        </p>
      </div>
    );
  }

  if (!data || data.histogram.total === 0 || data.histogram.bins.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {showTitle && <p className="font-semibold">Ціна</p>}
        {!data && status !== "error" ? (
          <PriceChartSkeleton />
        ) : (
          <div role={status === "error" ? "alert" : "status"} className="flex flex-col items-start gap-2 text-sm">
            <p className="text-muted-foreground">
              {status === "error" ? "Не вдалося завантажити розподіл цін." : "Немає об'єктів з такими умовами."}
            </p>
            {status === "error" && (
              <Button type="button" variant="outline" onClick={retry}>
                Спробувати ще
              </Button>
            )}
          </div>
        )}
        <PriceFields value={value} onChange={onChange} rates={data?.rates} />
        {showActions && <Actions onSubmit={onSubmit} onReset={() => onChange({ currency: value.currency })} />}
      </div>
    );
  }

  const { histogram, rates } = data;
  const { currency } = value;
  const usdFrom = value.from === undefined ? undefined : Math.floor(currencyToUsd(value.from, currency, rates));
  const usdTo = value.to === undefined ? undefined : Math.ceil(currencyToUsd(value.to, currency, rates));
  const positions = positionsFor(histogram, usdFrom, usdTo);
  const { count, approx } = countInRange(histogram, usdFrom, usdTo);

  const fromAt = (p: number) => valueAtPosition(histogram, p, "lower", currency, rates);
  const toAt = (p: number) => valueAtPosition(histogram, p, "upper", currency, rates);
  const handleSlide = ({ lo, hi }: Positions) => onChange({ currency, from: fromAt(lo), to: toAt(hi) });

  const median =
    histogram.median_usd === null
      ? null
      : formatPrice(niceAmount(histogram.median_usd, currency, rates, histogram.step_usd), currency);
  const summary = `Розподіл цін: ${objectsLabel(histogram.total)}, від ${formatPrice(
    niceAmount(histogram.min_usd ?? 0, currency, rates, histogram.step_usd),
    currency,
  )} до ${formatPrice(niceAmount(histogram.max_usd ?? 0, currency, rates, histogram.step_usd), currency)}.`;

  return (
    <div className="flex flex-col gap-4" aria-busy={status === "loading"}>
      <div className="flex items-baseline justify-between gap-3">
        {showTitle && <p className="font-semibold">Ціна</p>}
        {median && <p className="text-sm text-muted-foreground tabular-nums">медіана {median}</p>}
      </div>

      <div className={cn("flex flex-col px-3 transition-opacity", status === "loading" && "opacity-60")}>
        <PriceHistogramChart bins={histogram.bins} range={positions} />
        <PriceSlider
          bins={histogram.bins.length}
          positions={positions}
          onChange={handleSlide}
          from={fromAt(positions.lo)}
          to={toAt(positions.hi)}
          currency={currency}
        />
        <p className="sr-only">{summary}</p>
      </div>

      <PriceFields value={value} onChange={onChange} rates={rates} stepUsd={histogram.step_usd} />

      <p
        role="status"
        aria-live="polite"
        className={cn("text-sm text-muted-foreground tabular-nums", showActions && "sr-only")}
      >
        Знайдено <CountTween count={count} approx={approx} />
      </p>

      {showActions && (
        <Actions
          label={
            <>
              Показати <CountTween count={count} approx={approx} />
            </>
          }
          onSubmit={onSubmit}
          onReset={() => onChange({ currency })}
        />
      )}
    </div>
  );
};

type ActionsProps = { label?: React.ReactNode; onSubmit: () => void; onReset: () => void };

const Actions = ({ label = "Показати", onSubmit, onReset }: ActionsProps) => (
  <div className="grid grid-cols-[auto_1fr] gap-2">
    <Button type="button" variant="outline" size="lg" onClick={onReset}>
      Скинути
    </Button>
    <Button type="button" size="lg" onClick={onSubmit} className="tabular-nums">
      {label}
    </Button>
  </div>
);
