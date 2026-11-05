"use client";

import { useId } from "react";

import { FormSelect } from "@/components/form-select";
import { Label } from "@/components/ui/label";
import { PROPERTY_TYPE_LABELS } from "@/features/properties/property-labels";
import { cn } from "@/lib/utils";
import { FieldError } from "./field-error";
import { LEAD_PROPERTY_TYPES } from "./lead-form-values";

const PROPERTY_TYPE_OPTIONS = [
  { value: "", label: "Будь-який" },
  ...LEAD_PROPERTY_TYPES.map((type) => ({ value: type, label: PROPERTY_TYPE_LABELS[type] })),
];

type PropertyTypeFieldProps = { error?: string; className?: string };

/** Optional property type; «Будь-який» sends an empty value. */
export const PropertyTypeField = ({ error, className }: PropertyTypeFieldProps) => {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <Label htmlFor={id}>Тип нерухомості</Label>
      <FormSelect
        id={id}
        name="property_type"
        defaultValue=""
        options={PROPERTY_TYPE_OPTIONS}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
};
