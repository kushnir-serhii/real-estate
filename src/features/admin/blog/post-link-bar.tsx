"use client";

import { CircleAlert } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeLinkHref } from "./post-link";

type PostLinkBarProps = {
  /** The link under the cursor, if any. */
  initialHref: string;
  onApply: (href: string) => void;
  /** Null when the cursor is not inside a link. */
  onRemove: (() => void) | null;
  onClose: () => void;
};

/** Inline link form under the toolbar (no `window.prompt`). Enter applies, Escape closes. */
export const PostLinkBar = ({ initialHref, onApply, onRemove, onClose }: PostLinkBarProps) => {
  const id = useId();
  const [value, setValue] = useState(initialHref);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const apply = () => {
    const href = normalizeLinkHref(value);
    if (href === null) {
      setError("Вкажіть адресу, що починається з https://, http://, /, mailto: або tel:");
      inputRef.current?.focus();
      return;
    }
    onApply(href);
  };

  return (
    <div
      role="group"
      aria-label="Посилання"
      className="flex flex-col gap-2 border-b bg-muted/40 p-3"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <Label htmlFor={`${id}-href`}>Адреса посилання</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          ref={inputRef}
          id={`${id}-href`}
          type="text"
          inputMode="url"
          autoComplete="off"
          placeholder="https://…"
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              apply();
            }
          }}
          className="sm:flex-1"
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={apply}>
            Застосувати
          </Button>
          {onRemove && (
            <Button type="button" variant="outline" onClick={onRemove}>
              Прибрати
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose}>
            Закрити
          </Button>
        </div>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="flex items-start gap-1.5 text-sm font-medium text-destructive">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
};
