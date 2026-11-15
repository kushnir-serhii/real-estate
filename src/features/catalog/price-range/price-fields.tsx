"use client";

import { useId } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ExchangeRates } from "@/lib/db/settings";
import { CURRENCIES } from "@/lib/db/property-values";
import { cn } from "@/lib/utils";
import { convertAmount } from "./price-range-math";
import type { Currency, PriceValue } from "./price-range-math";

type PriceFieldsProps = {
  value: PriceValue;
  onChange: (next: PriceValue) => void;
  /** With the rates (and the bin step) a currency switch converts the numbers; without them only the unit changes. */
  rates?: ExchangeRates;
  stepUsd?: number;
  className?: string;
};

const parse = (raw: string): number | undefined => {
  if (raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

/** «Від» / «До» fields, «Без максимуму» and the currency switch. Unnamed inputs: the form is fed by hidden ones. */
export const PriceFields = ({ value, onChange, rates, stepUsd = 0, className }: PriceFieldsProps) => {
  const id = useId();
  const switchCurrency = (currency: Currency) => {
    if (currency === value.currency) return;
    const convert = (v: number | undefined) =>
      v === undefined || !rates ? v : convertAmount(v, value.currency, currency, rates, stepUsd);
    onChange({ from: convert(value.from), to: convert(value.to), currency });
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-from`}>Від</Label>
          <Input
            id={`${id}-from`}
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="0"
            value={value.from ?? ""}
            onChange={(e) => onChange({ ...value, from: parse(e.target.value) })}
            className="tabular-nums"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-to`}>До</Label>
          <Input
            id={`${id}-to`}
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Без ліміту"
            value={value.to ?? ""}
            onChange={(e) => onChange({ ...value, to: parse(e.target.value) })}
            className="tabular-nums"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <button
          type="button"
          onClick={() => onChange({ ...value, to: undefined })}
          disabled={value.to === undefined}
          className="-mx-2 inline-flex min-h-11 items-center px-2 text-sm whitespace-nowrap font-medium text-brand-text underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:text-muted-foreground disabled:no-underline"
        >
          Без максимуму
        </button>
        <div role="group" aria-label="Валюта" className="grid grid-cols-3 gap-1 rounded-control bg-muted p-1">
          {CURRENCIES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={value.currency === c}
              onClick={() => switchCurrency(c)}
              className="inline-flex h-9 min-w-11 items-center justify-center rounded-control px-2 text-sm font-semibold text-muted-foreground outline-none transition-colors duration-(--duration-fast) hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
