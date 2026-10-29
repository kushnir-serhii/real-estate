import { Search } from "lucide-react";
import Form from "next/form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FiltersAutoSubmit } from "@/features/admin/leads/filters-auto-submit";
import { SELECT_CLASS } from "@/features/catalog/catalog-labels";
import { DEAL_LABELS, PROPERTY_TYPE_LABELS } from "@/features/properties/property-labels";
import {
  ADMIN_PROPERTY_SEARCH_MAX_LENGTH,
  ADMIN_PROPERTY_SOURCES,
  ADMIN_PROPERTY_STATUSES,
} from "@/lib/db/admin-property-filters";
import type { AdminPropertyFilters } from "@/lib/db/admin-property-filters";
import { DEALS, PROPERTY_TYPES } from "@/lib/db/property-values";
import { cn } from "@/lib/utils";
import { ADMIN_PROPERTIES_PATH } from "./properties-params";
import { SOURCE_FILTER_LABELS, STATUS_FILTER_LABELS } from "./property-list-labels";

type PropertiesFiltersProps = { filters: AdminPropertyFilters };

const FIELD_CLASS = "flex min-w-0 flex-col gap-2";

/**
 * GET form, all state in the URL. Phones: search, the four selects in two columns, «Показати»;
 * from `lg` one row. Selects apply at once with JS; the search waits for Enter / «Показати».
 */
export const PropertiesFilters = ({ filters }: PropertiesFiltersProps) => (
  <Form
    action={ADMIN_PROPERTIES_PATH}
    aria-label="Фільтри об'єктів"
    className="grid grid-cols-2 items-end gap-3 md:grid-cols-4 lg:flex"
  >
    <div className={cn(FIELD_CLASS, "col-span-2 lg:flex-1")}>
      <Label htmlFor="properties-q">Назва, адреса або № Plektan</Label>
      <Input
        id="properties-q"
        name="q"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        maxLength={ADMIN_PROPERTY_SEARCH_MAX_LENGTH}
        defaultValue={filters.q ?? ""}
      />
    </div>

    <div className={cn(FIELD_CLASS, "lg:w-40")}>
      <Label htmlFor="properties-status">Статус</Label>
      <select id="properties-status" name="status" defaultValue={filters.status} className={SELECT_CLASS}>
        {ADMIN_PROPERTY_STATUSES.map((status) => (
          <option key={status} value={status}>
            {STATUS_FILTER_LABELS[status]}
          </option>
        ))}
      </select>
    </div>

    <div className={cn(FIELD_CLASS, "lg:w-36")}>
      <Label htmlFor="properties-source">Джерело</Label>
      <select id="properties-source" name="source" defaultValue={filters.source} className={SELECT_CLASS}>
        {ADMIN_PROPERTY_SOURCES.map((source) => (
          <option key={source} value={source}>
            {SOURCE_FILTER_LABELS[source]}
          </option>
        ))}
      </select>
    </div>

    <div className={cn(FIELD_CLASS, "lg:w-44")}>
      <Label htmlFor="properties-deal">Угода</Label>
      <select id="properties-deal" name="deal" defaultValue={filters.deal} className={SELECT_CLASS}>
        <option value="all">Усі</option>
        {DEALS.map((deal) => (
          <option key={deal} value={deal}>
            {DEAL_LABELS[deal]}
          </option>
        ))}
      </select>
    </div>

    <div className={cn(FIELD_CLASS, "lg:w-40")}>
      <Label htmlFor="properties-type">Тип</Label>
      <select id="properties-type" name="type" defaultValue={filters.type} className={SELECT_CLASS}>
        <option value="all">Усі</option>
        {PROPERTY_TYPES.map((type) => (
          <option key={type} value={type}>
            {PROPERTY_TYPE_LABELS[type]}
          </option>
        ))}
      </select>
    </div>

    <Button type="submit" className="col-span-2 md:col-span-4 lg:col-span-1">
      <Search aria-hidden="true" />
      Показати
    </Button>

    <FiltersAutoSubmit />
  </Form>
);
