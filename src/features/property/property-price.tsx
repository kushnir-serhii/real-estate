import { cn } from "@/lib/utils";

type PropertyPriceProps = {
  price: string;
  perSquareMeter: string | null;
  facts: string[];
  className?: string;
};

/** Price in the property's currency, the per-m² line and a short facts line. */
export const PropertyPrice = ({ price, perSquareMeter, facts, className }: PropertyPriceProps) => (
  <div className={cn("flex flex-col gap-1", className)}>
    <p className="text-3xl font-bold break-words tabular-nums">{price}</p>
    {perSquareMeter && <p className="text-sm text-muted-foreground tabular-nums">{perSquareMeter}</p>}
    {facts.length > 0 && <p className="mt-1 text-base">{facts.join(" · ")}</p>}
  </div>
);
