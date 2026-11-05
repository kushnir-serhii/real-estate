import {
  Award,
  BedDouble,
  BrickWall,
  Building2,
  Home,
  Info,
  Layers,
  LandPlot,
  PaintRoller,
  Ruler,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PROPERTY_PAGE } from "@/constants/inner-pages";
import type { FactRow } from "./property-details";

type PropertyFactsProps = { rows: FactRow[] };

// Keyed by the row labels from `factRows`; an unknown label falls back to the info icon.
const ICONS: Record<string, LucideIcon> = {
  Тип: Home,
  Кімнат: BedDouble,
  "Загальна площа": Ruler,
  "Житлова площа": Ruler,
  Кухня: Ruler,
  Ділянка: LandPlot,
  Поверх: Layers,
  Поверховість: Building2,
  Ремонт: PaintRoller,
  Стіни: BrickWall,
  "Клас житла": Award,
  Новобудова: Sparkles,
};

export const PropertyFacts = ({ rows }: PropertyFactsProps) => {
  if (rows.length === 0) return null;
  return (
    <section aria-labelledby="property-facts-title">
      <h2 id="property-facts-title" className="text-h3">
        {PROPERTY_PAGE.factsTitle}
      </h2>
      <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {rows.map((row) => {
          const Icon = ICONS[row.label] ?? Info;
          return (
            <div
              key={row.label}
              className="flex min-w-0 flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
            >
              <span
                aria-hidden="true"
                className="flex size-9 items-center justify-center rounded-full bg-secondary text-dawn-text"
              >
                <Icon className="size-4" />
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <dt className="text-sm text-muted-foreground">{row.label}</dt>
                <dd className="font-semibold break-words tabular-nums">{row.value}</dd>
              </div>
            </div>
          );
        })}
      </dl>
    </section>
  );
};
