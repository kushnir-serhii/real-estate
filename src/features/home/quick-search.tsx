import { Search } from "lucide-react";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PROPERTY_TYPE_LABELS } from "@/features/properties/property-labels";
import { CURRENCIES } from "@/lib/db/property-values";
import { cn } from "@/lib/utils";

const SELECT_CLASS =
  "h-11 w-full min-w-0 rounded-lg border border-control bg-background px-3 text-base text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const DEAL_OPTIONS = [
  { value: "sell", label: "Купити" },
  { value: "rent_long", label: "Орендувати" },
  { value: "rent_day", label: "Подобово" },
] as const;

const ROOM_CHOICES = ["1", "2", "3", "4", "5+"] as const;

type FieldProps = { label: string; htmlFor: string; children: React.ReactNode };

const Field = ({ label, htmlFor, children }: FieldProps) => (
  <div className="flex flex-col gap-2">
    <Label htmlFor={htmlFor}>{label}</Label>
    {children}
  </div>
);

/** Plain GET form to /catalog. Works without JS. */
export const QuickSearch = () => {
  const id = useId();
  const typeId = `${id}-type`;
  const roomsId = `${id}-rooms`;
  const budgetId = `${id}-budget`;
  const currencyId = `${id}-currency`;

  return (
    <form
      action="/catalog"
      method="get"
      aria-label="Швидкий пошук"
      className="flex flex-col gap-5 rounded-3xl bg-card p-4 text-card-foreground shadow-float ring-1 ring-border sm:p-6"
    >
      <fieldset className="min-w-0">
        <legend className="sr-only">Що потрібно</legend>
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1 sm:max-w-md">
          {DEAL_OPTIONS.map((o) => (
            <label
              key={o.value}
              className="relative flex h-11 cursor-pointer items-center justify-center rounded-xl px-2 text-sm font-semibold text-muted-foreground transition-colors duration-(--duration-fast) hover:text-foreground has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(3,1fr)_auto]">
        <Field label="Тип" htmlFor={typeId}>
          <select id={typeId} name="property_type" defaultValue="" className={SELECT_CLASS}>
            <option value="">Будь-який</option>
            {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Кімнат" htmlFor={roomsId}>
          <select id={roomsId} name="rooms" defaultValue="" className={SELECT_CLASS}>
            <option value="">Будь-яка</option>
            {ROOM_CHOICES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Бюджет до" htmlFor={budgetId}>
          <div className="flex gap-2">
            <Input
              id={budgetId}
              name="price_to"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Будь-який"
            />
            <select
              id={currencyId}
              name="currency"
              defaultValue="USD"
              aria-label="Валюта"
              className={cn(SELECT_CLASS, "w-24 shrink-0")}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </Field>
        <Button
          type="submit"
          variant="dawn"
          size="lg"
          className="self-end sm:col-span-2 lg:col-span-1"
        >
          <Search aria-hidden="true" />
          Знайти
        </Button>
      </div>
    </form>
  );
};
