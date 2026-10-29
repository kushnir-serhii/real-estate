import { CircleAlert } from "lucide-react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type PropertyFieldProps = {
  /** Id of the control; the hint is `<id>-hint`, the error `<id>-error`. */
  id: string;
  label: string;
  hint?: React.ReactNode;
  error?: string;
  className?: string;
  children: React.ReactNode;
};

/** `aria-describedby` for a control rendered inside `PropertyField`. */
export const fieldDescribedBy = (id: string, hasHint: boolean, error: string | undefined): string | undefined =>
  [error ? `${id}-error` : null, hasHint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;

/** Label, the control, a hint and the inline error (error first for screen readers). */
export const PropertyField = ({ id, label, hint, error, className, children }: PropertyFieldProps) => (
  <div className={cn("flex min-w-0 flex-col gap-2", className)}>
    <Label htmlFor={id} className="leading-snug">
      {label}
    </Label>
    {children}
    {error && (
      <p id={`${id}-error`} className="flex items-start gap-1.5 text-sm font-medium wrap-anywhere text-destructive">
        <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {error}
      </p>
    )}
    {hint && (
      <p id={`${id}-hint`} className="text-sm text-muted-foreground">
        {hint}
      </p>
    )}
  </div>
);
