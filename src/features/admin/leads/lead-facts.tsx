import { cn } from "@/lib/utils";

export type LeadFact = { label: string; value: React.ReactNode };

type LeadFactsProps = { facts: LeadFact[]; className?: string };

/** Label/value pairs: label over value at 375px, two columns from `sm`. Values wrap, never overflow. */
export const LeadFacts = ({ facts, className }: LeadFactsProps) => (
  <dl className={cn("grid gap-x-4 gap-y-3 text-sm sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]", className)}>
    {facts.map((fact) => (
      <div key={fact.label} className="grid min-w-0 gap-0.5 sm:col-span-2 sm:grid-cols-subgrid sm:items-baseline sm:gap-x-4">
        <dt className="text-muted-foreground">{fact.label}</dt>
        <dd className="min-w-0 wrap-anywhere">{fact.value}</dd>
      </div>
    ))}
  </dl>
);
