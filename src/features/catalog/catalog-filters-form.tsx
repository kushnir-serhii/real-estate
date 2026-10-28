import Form from "next/form";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PROP_KIND_LABELS, PROPERTY_TYPE_LABELS } from "@/features/properties/property-labels";
import { ROOM_OPTIONS } from "@/lib/db/properties";
import { CURRENCIES, PROP_KINDS_BY_PROPERTY, PROPERTY_TYPES } from "@/lib/db/property-values";
import { cn } from "@/lib/utils";
import { resetHref, typeHasArea, typeHasRooms } from "./catalog-params";
import type { CatalogState } from "./catalog-params";
import { DEAL_OPTIONS, SELECT_CLASS } from "./catalog-labels";

type CatalogFiltersFormProps = {
  state: CatalogState;
  districts: string[];
  /** Unique per rendered instance (sidebar, sheet, no-JS fallback) so ids don't clash. */
  idPrefix: string;
  /** Sheet: action buttons stick to the bottom of the scrolling panel. */
  stickyActions?: boolean;
};

const CHIP_CLASS =
  "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border border-control bg-background px-3 text-sm font-medium transition-colors select-none hover:bg-muted has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50 dark:bg-input/30";

const LEGEND_CLASS = "mb-2 text-sm leading-none font-medium";

type FieldProps = { label: string; htmlFor: string; children: React.ReactNode };

const Field = ({ label, htmlFor, children }: FieldProps) => (
  <div className="flex flex-col gap-2">
    <Label htmlFor={htmlFor}>{label}</Label>
    {children}
  </div>
);

type RangeProps = {
  idPrefix: string;
  name: "price" | "area";
  label: string;
  from?: number;
  to?: number;
};

const Range = ({ idPrefix, name, label, from, to }: RangeProps) => (
  <div className="grid grid-cols-2 gap-2">
    <div>
      <Label htmlFor={`${idPrefix}-${name}-from`} className="sr-only">
        {label} від
      </Label>
      <Input
        id={`${idPrefix}-${name}-from`}
        name={`${name}_from`}
        type="number"
        inputMode="numeric"
        min={0}
        placeholder="від"
        defaultValue={from}
        className="tabular-nums"
      />
    </div>
    <div>
      <Label htmlFor={`${idPrefix}-${name}-to`} className="sr-only">
        {label} до
      </Label>
      <Input
        id={`${idPrefix}-${name}-to`}
        name={`${name}_to`}
        type="number"
        inputMode="numeric"
        min={0}
        placeholder="до"
        defaultValue={to}
        className="tabular-nums"
      />
    </div>
  </div>
);

/**
 * Catalog filters: a plain GET form (works without JS; `next/form` navigates client-side with JS).
 * The kind list depends on the type in the URL: after changing the type, «Показати» updates it.
 */
export const CatalogFiltersForm = ({
  state,
  districts,
  idPrefix,
  stickyActions = false,
}: CatalogFiltersFormProps) => {
  const kinds = state.property_type ? PROP_KINDS_BY_PROPERTY[state.property_type] : [];
  // Keep a district from the URL selectable even if no published property has it any more.
  const districtOptions =
    state.district && !districts.includes(state.district) ? [state.district, ...districts] : districts;

  return (
    <Form action="/catalog" aria-label="Фільтри" className="flex flex-col gap-5">
      <Field label="Що потрібно" htmlFor={`${idPrefix}-deal`}>
        <select id={`${idPrefix}-deal`} name="deal" defaultValue={state.deal ?? ""} className={SELECT_CLASS}>
          <option value="">Усі варіанти</option>
          {DEAL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Тип нерухомості" htmlFor={`${idPrefix}-type`}>
        <select
          id={`${idPrefix}-type`}
          name="property_type"
          defaultValue={state.property_type ?? ""}
          className={SELECT_CLASS}
        >
          <option value="">Будь-який</option>
          {PROPERTY_TYPES.map((t) => (
            <option key={t} value={t}>
              {PROPERTY_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </Field>

      {kinds.length > 0 && (
        <Field label="Вид" htmlFor={`${idPrefix}-kind`}>
          <select
            id={`${idPrefix}-kind`}
            name="prop_kind"
            defaultValue={state.prop_kind ?? ""}
            className={SELECT_CLASS}
          >
            <option value="">Будь-який</option>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {PROP_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
      )}

      {typeHasRooms(state.property_type) && (
        <fieldset>
          <legend className={LEGEND_CLASS}>Кімнат</legend>
          <div className="flex flex-wrap gap-2">
            {ROOM_OPTIONS.map((r) => (
              <label key={r} className={CHIP_CLASS}>
                <input
                  type="checkbox"
                  name="rooms"
                  value={r}
                  defaultChecked={state.rooms.includes(r)}
                  className="sr-only"
                />
                {r}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className={LEGEND_CLASS}>Ціна</legend>
        <div className="flex flex-col gap-2">
          <Range idPrefix={idPrefix} name="price" label="Ціна" from={state.price_from} to={state.price_to} />
          <fieldset className="grid grid-cols-3 gap-2">
            <legend className="sr-only">Валюта</legend>
            {CURRENCIES.map((c) => (
              <label key={c} className={CHIP_CLASS}>
                <input
                  type="radio"
                  name="currency"
                  value={c}
                  defaultChecked={state.currency === c}
                  className="sr-only"
                />
                {c}
              </label>
            ))}
          </fieldset>
        </div>
      </fieldset>

      {typeHasArea(state.property_type) && (
        <fieldset>
          <legend className={LEGEND_CLASS}>Площа, м²</legend>
          <Range idPrefix={idPrefix} name="area" label="Площа" from={state.area_from} to={state.area_to} />
        </fieldset>
      )}

      {districtOptions.length > 0 && (
        <Field label="Район" htmlFor={`${idPrefix}-district`}>
          <select
            id={`${idPrefix}-district`}
            name="district"
            defaultValue={state.district ?? ""}
            className={SELECT_CLASS}
          >
            <option value="">Будь-який</option>
            {districtOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>
      )}

      {/* Keep the chosen order when filters change. */}
      {state.sort !== "newest" && <input type="hidden" name="sort" value={state.sort} />}

      <div
        className={cn(
          "grid grid-cols-2 gap-2",
          stickyActions && "sticky bottom-0 -mx-4 border-t bg-popover px-4 py-3",
        )}
      >
        <Link href={resetHref(state)} className={buttonVariants({ variant: "outline", size: "lg" })}>
          Скинути
        </Link>
        <Button type="submit" size="lg">
          Показати
        </Button>
      </div>
    </Form>
  );
};
