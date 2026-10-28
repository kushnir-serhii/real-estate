"use client";

import { useId } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { SELECT_CLASS, SORT_OPTIONS } from "./catalog-labels";
import type { Sort } from "./catalog-params";

type SortSelectProps = { value: Sort };

/** Submits its form on change (with JS); without JS the form shows an «Застосувати» button. */
export const SortSelect = ({ value }: SortSelectProps) => {
  const id = useId();
  return (
    <>
      <Label htmlFor={id} className="sr-only">
        Сортування
      </Label>
      <select
        id={id}
        name="sort"
        defaultValue={value}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className={cn(SELECT_CLASS, "w-auto")}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </>
  );
};
