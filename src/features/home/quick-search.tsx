import { Search } from "lucide-react";
import { useId } from "react";

import { FormSelect } from "@/components/form-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PriceRangeField } from "@/features/catalog/price-range/price-range-field";
import { PROPERTY_TYPE_LABELS } from "@/features/properties/property-labels";

const DEAL_OPTIONS = [
  { value: "sell", label: "Купити" },
  { value: "rent_long", label: "Орендувати" },
  { value: "rent_day", label: "Подобово" },
] as const;

const TYPE_OPTIONS = [
  { value: "", label: "Будь-який" },
  ...Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

const ROOM_OPTIONS = [
  { value: "", label: "Будь-яка" },
  ...["1", "2", "3", "4", "5+"].map((r) => ({ value: r, label: r })),
];

type FieldProps = { label: string; htmlFor: string; children: React.ReactNode };

/** One cell of the row: small label over the value; the control stretches over the whole cell (after:inset-0). */
const Field = ({ label, htmlFor, children }: FieldProps) => (
  <div className="relative flex min-w-0 flex-col gap-1 px-4 py-3 has-focus-visible:ring-2 has-focus-visible:ring-ring has-focus-visible:ring-inset sm:px-5">
    <Label htmlFor={htmlFor} className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
      {label}
    </Label>
    {children}
  </div>
);

const CELL_SELECT = "h-auto rounded-none border-0 bg-transparent p-0 font-medium focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent after:absolute after:inset-0";

/** Plain GET form to /catalog. Works without JS. */
export const QuickSearch = () => {
  const id = useId();
  const typeId = `${id}-type`;
  const roomsId = `${id}-rooms`;
  const budgetId = `${id}-budget`;

  return (
    <form action="/catalog" method="get" aria-label="Швидкий пошук" className="flex flex-col gap-2">
      <fieldset className="min-w-0">
        <legend className="sr-only">Що потрібно</legend>
        <div className="flex flex-wrap gap-x-6">
          {DEAL_OPTIONS.map((o) => (
            <label
              key={o.value}
              className="relative flex h-11 cursor-pointer items-center border-b-2 border-transparent text-sm font-semibold text-on-scrim/75 transition-colors duration-(--duration-fast) hover:text-on-scrim has-checked:border-on-scrim has-checked:text-on-scrim has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
            >
              <input
                type="radio"
                name="deal"
                value={o.value}
                defaultChecked={o.value === "sell"}
                className="sr-only"
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid divide-y divide-border bg-card text-card-foreground shadow-float ring-1 ring-border lg:grid-cols-[1fr_1fr_1.3fr_auto] lg:divide-x lg:divide-y-0">
        <Field label="Тип" htmlFor={typeId}>
          <FormSelect id={typeId} name="property_type" options={TYPE_OPTIONS} className={CELL_SELECT} />
        </Field>
        <Field label="Кімнат" htmlFor={roomsId}>
          <FormSelect id={roomsId} name="rooms" options={ROOM_OPTIONS} className={CELL_SELECT} />
        </Field>
        <Field label="Бюджет" htmlFor={budgetId}>
          <PriceRangeField variant="popover" appearance="cell" id={budgetId} />
        </Field>
        <div className="p-2">
          <Button type="submit" variant="default" size="lg" className="h-12 w-full lg:h-full lg:px-8">
            <Search aria-hidden="true" />
            Знайти
          </Button>
        </div>
      </div>
    </form>
  );
};
