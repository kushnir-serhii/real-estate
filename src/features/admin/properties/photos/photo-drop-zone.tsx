"use client";

import { ImagePlus } from "lucide-react";
import { useId, useRef } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PHOTO_LIMITS_HINT } from "./photo-file-check";
import { ACCEPT_ATTRIBUTE, MAX_PHOTOS } from "./photo-limits";

type PhotoDropZoneProps = {
  /** Files are being dragged over the photo section. */
  fileOver: boolean;
  /** No free slots left (stored + in progress). */
  full: boolean;
  onFiles: (files: File[]) => void;
  /** The «Додати фото» button (focus lands here when the last photo is deleted). */
  buttonRef?: React.Ref<HTMLButtonElement>;
};

/** «Додати фото» (file picker; phones offer camera or gallery) inside a drop area with the limits. */
export const PhotoDropZone = ({ fileOver, full, onFiles, buttonRef }: PhotoDropZoneProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border px-4 py-6 text-center transition-colors",
        fileOver && !full && "border-primary bg-accent",
      )}
    >
      <ImagePlus className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="hidden font-medium pointer-fine:block">
        {fileOver && !full ? "Відпустіть, щоб додати" : "Перетягніть фото сюди або"}
      </p>
      <Button
        ref={buttonRef}
        type="button"
        disabled={full}
        aria-describedby={hintId}
        onClick={() => inputRef.current?.click()}
      >
        <ImagePlus aria-hidden="true" />
        Додати фото
      </Button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={(event) => {
          const files = [...(event.currentTarget.files ?? [])];
          // Reset so picking the same file again (after an error) fires `change` again.
          event.currentTarget.value = "";
          onFiles(files);
        }}
      />
      <p id={hintId} className="max-w-prose text-sm text-muted-foreground">
        {full ? `Уже ${MAX_PHOTOS} фото — це максимум. Видаліть зайві, щоб додати нові.` : PHOTO_LIMITS_HINT}
      </p>
    </div>
  );
};
