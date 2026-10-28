"use client";

import { useId } from "react";

import { Label } from "@/components/ui/label";
import { PROPERTY_TYPE_LABELS } from "@/features/properties/property-labels";
import { cn } from "@/lib/utils";
import { FieldError } from "./field-error";
import { LEAD_PROPERTY_TYPES } from "./lead-form-schema";

const SELECT_CLASS =
  "h-11 w-full min-w-0 rounded-lg border border-control bg-background px-3 text-base text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30";

type PropertyTypeFieldProps = { error?: string; className?: string };

/** Optional property type; «Будь-який» sends an empty value. */
export const PropertyTypeField = ({ error, className }: PropertyTypeFieldProps) => {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <Label htmlFor={id}>Тип нерухомості</Label>
      <select
        id={id}
        name="property_type"
        defaultValue=""
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={SELECT_CLASS}
      >
        <option value="">Будь-який</option>
        {LEAD_PROPERTY_TYPES.map((type) => (
          <option key={type} value={type}>
            {PROPERTY_TYPE_LABELS[type]}
          </option>
        ))}
      </select>
      <FieldError id={errorId} message={error} />
    </div>
  );
};
