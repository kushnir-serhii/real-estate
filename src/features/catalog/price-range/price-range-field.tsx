import { Input } from "@/components/ui/input";
import { CURRENCIES } from "@/lib/db/property-values";
import { cn } from "@/lib/utils";
import { PriceRange } from "./price-range";
import type { PriceRangeProps } from "./price-range";

/**
 * Price filter for a GET form (Server Component). Without JS the `<noscript>` inputs submit as before
 * (`price_from`, `price_to`, `currency`); with JS the interactive `PriceRange` takes over.
 * The no-JS inputs live here, on the server, so they cost no client JS.
 */
export const PriceRangeField = (props: Omit<PriceRangeProps, "children">) => {
  const { variant, id, defaultFrom, defaultTo, defaultCurrency = "USD" } = props;
  const inline = variant === "inline";
  return (
    <PriceRange {...props}>
      <noscript>
        <div className="grid grid-cols-2 gap-2">
          {inline && (
            <Input
              type="number"
              name="price_from"
              min={0}
              placeholder="від"
              aria-label="Ціна від"
              defaultValue={defaultFrom}
              className="tabular-nums"
            />
          )}
          <Input
            id={id}
            type="number"
            name="price_to"
            min={0}
            placeholder={inline ? "до" : "Будь-який"}
            aria-label={inline ? "Ціна до" : "Бюджет до"}
            defaultValue={defaultTo}
            className={cn("tabular-nums", !inline && "col-span-2")}
          />
          <select
            name="currency"
            defaultValue={defaultCurrency}
            aria-label="Валюта"
            className="col-span-2 h-11 w-full min-w-0 rounded-control border border-control bg-background px-4 text-base text-foreground"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </noscript>
    </PriceRange>
  );
};
