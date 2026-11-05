"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Radix Select forbids "" as an item value, so an empty option travels as this sentinel. */
const EMPTY = "__empty";

export type FormSelectOption = { value: string; label: string };

type FormSelectProps = {
  name: string;
  id?: string;
  options: readonly FormSelectOption[];
  defaultValue?: string;
  placeholder?: string;
  /** Associates the control with a form elsewhere in the document (by form id). */
  form?: string;
  /** Submit the owning form right after a change. */
  submitOnChange?: boolean;
  onValueChange?: (value: string) => void;
  className?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

const subscribe = () => () => {};

/**
 * Styled select for forms. Submits exactly what a native select would: an option with value ""
 * sends an empty param. With JS a hidden input carries the value; without JS (Radix is a dead button)
 * a native select inside noscript takes over and the Radix one is hidden by `.nojs-hide`.
 */
export const FormSelect = ({
  name,
  id,
  options,
  defaultValue = "",
  placeholder,
  form,
  submitOnChange = false,
  onValueChange,
  className,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: FormSelectProps) => {
  const [value, setValue] = useState(defaultValue);
  const hiddenRef = useRef<HTMLInputElement>(null);
  // false during SSR and the first client render: then only the noscript native select carries the name.
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);

  const handleChange = (next: string) => {
    const real = next === EMPTY ? "" : next;
    flushSync(() => setValue(real));
    onValueChange?.(real);
    if (submitOnChange) hiddenRef.current?.form?.requestSubmit();
  };

  return (
    <>
      <noscript>
        <select
          id={id}
          name={name}
          defaultValue={defaultValue}
          form={form}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          className="h-11 w-full min-w-0 rounded-xl border border-control bg-background px-3 text-base text-foreground"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </noscript>
      <div className="nojs-hide contents">
        <Select value={value === "" ? EMPTY : value} onValueChange={handleChange}>
          <SelectTrigger
            id={hydrated ? id : undefined}
            aria-label={ariaLabel}
            aria-invalid={ariaInvalid}
            aria-describedby={ariaDescribedBy}
            className={className}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value === "" ? EMPTY : o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hydrated && <input ref={hiddenRef} type="hidden" name={name} value={value} form={form} />}
      </div>
    </>
  );
};
