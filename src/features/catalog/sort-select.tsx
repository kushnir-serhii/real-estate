"use client";

import { useId } from "react";

import { FormSelect } from "@/components/form-select";
import { Label } from "@/components/ui/label";
import { SORT_OPTIONS } from "./catalog-labels";
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
      <FormSelect
        id={id}
        name="sort"
        defaultValue={value}
        options={SORT_OPTIONS}
        submitOnChange
        className="w-auto min-w-48"
      />
    </>
  );
};
