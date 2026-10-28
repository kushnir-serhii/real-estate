import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PropertyPriceProps = {
  price: string;
  perSquareMeter: string | null;
  facts: string[];
  /** Optional control at the end of the price line (favorites heart). */
  action?: ReactNode;
  className?: string;
};

/** Price in the property's currency, the per-m² line and a short facts line. */
export const PropertyPrice = ({ price, perSquareMeter, facts, action, className }: PropertyPriceProps) => (
  <div className={cn("flex flex-col gap-1", className)}>
    <div className="flex items-start justify-between gap-3">
      <p className="min-w-0 text-3xl font-bold break-words tabular-nums">{price}</p>
      {action}
    </div>
    {perSquareMeter && <p className="text-sm text-muted-foreground tabular-nums">{perSquareMeter}</p>}
    {facts.length > 0 && <p className="mt-1 text-base">{facts.join(" · ")}</p>}
  </div>
);
