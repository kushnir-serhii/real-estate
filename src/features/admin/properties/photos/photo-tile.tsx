"use client";

import { ChevronLeft, ChevronRight, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AdminPropertyPhoto } from "@/lib/db/admin-properties";
import { cn } from "@/lib/utils";
import type { PhotoActionResult } from "../photo-actions";
import { DeletePhotoButton } from "./delete-photo-button";
import { PhotoImage } from "./photo-image";

export type PhotoControl = "earlier" | "later" | "cover" | "delete";

type PhotoTileProps = {
  photo: AdminPropertyPhoto;
  index: number;
  total: number;
  /** Being dragged / where the dragged photo would land. */
  drag: "idle" | "dragging" | "before" | "after";
  dragProps: Pick<
    React.ComponentProps<"li">,
    "draggable" | "onDragStart" | "onDragOver" | "onDrop" | "onDragEnd"
  >;
  onMove: (toIndex: number, control: PhotoControl) => void;
  onDelete: () => Promise<PhotoActionResult>;
  onDeleted: () => void;
};

/** One photo with its controls: earlier / later, delete, make cover. Every target is 44 px. */
export const PhotoTile = ({ photo, index, total, drag, dragProps, onMove, onDelete, onDeleted }: PhotoTileProps) => {
  const number = index + 1;
  return (
    <li
      data-photo-id={photo.id}
      {...dragProps}
      className={cn(
        "relative flex min-w-0 flex-col gap-2 pointer-fine:cursor-grab",
        drag === "dragging" && "opacity-50",
        // Where the dropped photo lands: a bar in the gap before / after this one.
        (drag === "before" || drag === "after") &&
          "before:absolute before:inset-y-0 before:w-1 before:rounded-full before:bg-primary",
        drag === "before" && "before:-left-2",
        drag === "after" && "before:-right-2",
      )}
    >
      <PhotoImage photo={photo} index={index} />
      <div className="grid grid-cols-3 gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="w-full"
          disabled={index === 0}
          aria-label={`Фото ${number}: на місце раніше`}
          title="На місце раніше"
          data-photo-control="earlier"
          onClick={() => onMove(index - 1, "earlier")}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="w-full"
          disabled={index === total - 1}
          aria-label={`Фото ${number}: на місце пізніше`}
          title="На місце пізніше"
          data-photo-control="later"
          onClick={() => onMove(index + 1, "later")}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
        <DeletePhotoButton number={number} onDelete={onDelete} onDeleted={onDeleted} />
      </div>
      {index === 0 ? (
        <p className="flex min-h-11 items-center justify-center gap-1.5 text-center text-sm text-muted-foreground">
          <Star className="size-4 shrink-0" aria-hidden="true" />
          Це обкладинка
        </p>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="h-auto min-h-11 w-full px-2 py-2 whitespace-normal"
          aria-label={`Зробити обкладинкою (фото ${number})`}
          data-photo-control="cover"
          onClick={() => onMove(0, "cover")}
        >
          Зробити обкладинкою
        </Button>
      )}
    </li>
  );
};
