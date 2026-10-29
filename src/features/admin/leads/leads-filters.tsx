import { Search } from "lucide-react";
import Form from "next/form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SELECT_CLASS } from "@/features/catalog/catalog-labels";
import { ADMIN_LEAD_KINDS, SEARCH_MAX_LENGTH } from "@/lib/db/admin-lead-filters";
import type { AdminLeadFilters } from "@/lib/db/admin-lead-filters";
import { cn } from "@/lib/utils";
import { FiltersAutoSubmit } from "./filters-auto-submit";
import { LEAD_KIND_LABELS } from "./lead-kind-labels";
import { ADMIN_LEADS_PATH } from "./leads-params";

type LeadsFiltersProps = { filters: AdminLeadFilters };

const FIELD_CLASS = "flex min-w-0 flex-col gap-2";

/**
 * GET form, all state in the URL. Phones: stacked (search, type, dates in two columns, toggle +
 * «Показати»); from `lg` one row. The kind and «Не доставлено» apply at once with JS.
 */
export const LeadsFilters = ({ filters }: LeadsFiltersProps) => (
  <Form
    action={ADMIN_LEADS_PATH}
    aria-label="Фільтри заявок"
    className="grid grid-cols-2 items-end gap-3 md:grid-cols-4 lg:flex"
  >
    <div className={cn(FIELD_CLASS, "col-span-2 lg:flex-1")}>
      <Label htmlFor="leads-q">Пошук за іменем або телефоном</Label>
      <Input
        id="leads-q"
        name="q"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        maxLength={SEARCH_MAX_LENGTH}
        defaultValue={filters.q ?? ""}
      />
    </div>

    <div className={cn(FIELD_CLASS, "col-span-2 lg:w-48")}>
      <Label htmlFor="leads-kind">Тип заявки</Label>
      <select id="leads-kind" name="kind" defaultValue={filters.kind ?? ""} className={SELECT_CLASS}>
        <option value="">Усі</option>
        {ADMIN_LEAD_KINDS.map((kind) => (
          <option key={kind} value={kind}>
            {LEAD_KIND_LABELS[kind]}
          </option>
        ))}
      </select>
    </div>

    <div className={cn(FIELD_CLASS, "lg:w-40")}>
      <Label htmlFor="leads-from">Від</Label>
      <Input id="leads-from" name="from" type="date" defaultValue={filters.from ?? ""} className="tabular-nums" />
    </div>

    <div className={cn(FIELD_CLASS, "lg:w-40")}>
      <Label htmlFor="leads-to">До</Label>
      <Input id="leads-to" name="to" type="date" defaultValue={filters.to ?? ""} className="tabular-nums" />
    </div>

    <label
      htmlFor="leads-failed"
      className="flex h-11 min-w-0 items-center gap-2 rounded-lg border border-control px-3 text-sm font-medium whitespace-nowrap transition-colors select-none hover:bg-muted has-checked:border-destructive has-checked:bg-destructive/10 has-checked:text-destructive has-focus-visible:ring-3 has-focus-visible:ring-ring/50 dark:bg-input/30"
    >
      <input
        id="leads-failed"
        type="checkbox"
        name="failed"
        value="1"
        defaultChecked={filters.failed}
        className="size-4 shrink-0 accent-destructive outline-none"
      />
      Не доставлено
    </label>

    <Button type="submit">
      <Search aria-hidden="true" />
      Показати
    </Button>

    <FiltersAutoSubmit />
  </Form>
);
