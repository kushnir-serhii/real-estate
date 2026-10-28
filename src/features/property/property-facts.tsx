import type { FactRow } from "./property-details";

type PropertyFactsProps = { rows: FactRow[] };

export const PropertyFacts = ({ rows }: PropertyFactsProps) => {
  if (rows.length === 0) return null;
  return (
    <section aria-labelledby="property-facts-title">
      <h2 id="property-facts-title" className="text-xl font-bold">
        Характеристики
      </h2>
      <dl className="mt-3 grid gap-x-8 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 border-b py-3">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="text-right font-medium break-words tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
