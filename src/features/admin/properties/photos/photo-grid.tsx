"use client";

import { useState } from "react";

import type { AdminPropertyPhoto } from "@/lib/db/admin-properties";
import type { PhotoActionResult } from "../photo-actions";
import { dropIndex } from "./photo-order";
import { PhotoTile } from "./photo-tile";
import type { PhotoControl } from "./photo-tile";

/** Our own drag type: file drags (`Files`) and photo drags never mix. */
const PHOTO_DRAG_TYPE = "application/x-property-photo";

type DragState = { id: string; over: { id: string; side: "before" | "after" } | null };

type PhotoGridProps = {
  photos: readonly AdminPropertyPhoto[];
  ref?: React.Ref<HTMLUListElement>;
  /** `control` is set for button moves (the focus follows the photo), absent for drag & drop. */
  onMove: (id: string, toIndex: number, control?: PhotoControl) => void;
  onDelete: (id: string) => Promise<PhotoActionResult>;
  onDeleted: (index: number) => void;
};

/** The editable photo grid: buttons everywhere, native drag & drop with a mouse. */
export const PhotoGrid = ({ photos, ref, onMove, onDelete, onDeleted }: PhotoGridProps) => {
  const [drag, setDrag] = useState<DragState | null>(null);

  const tileDrag = (id: string) => {
    if (drag === null) return "idle";
    if (drag.id === id) return "dragging";
    return drag.over?.id === id ? drag.over.side : "idle";
  };

  return (
    <ul ref={ref} aria-label="Фото об'єкта" className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
      {photos.map((photo, index) => (
        <PhotoTile
          key={photo.id}
          photo={photo}
          index={index}
          total={photos.length}
          drag={tileDrag(photo.id)}
          dragProps={{
            draggable: true,
            onDragStart: (event) => {
              // Drags that start on a button (or inside the delete dialog) are not photo moves.
              if (event.target instanceof Element && event.target.closest("button")) {
                event.preventDefault();
                return;
              }
              event.dataTransfer.setData(PHOTO_DRAG_TYPE, photo.id);
              event.dataTransfer.effectAllowed = "move";
              setDrag({ id: photo.id, over: null });
            },
            onDragOver: (event) => {
              if (drag === null || !event.dataTransfer.types.includes(PHOTO_DRAG_TYPE)) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              const rect = event.currentTarget.getBoundingClientRect();
              const side = event.clientX < rect.left + rect.width / 2 ? "before" : "after";
              if (drag.over?.id !== photo.id || drag.over.side !== side) {
                setDrag({ id: drag.id, over: { id: photo.id, side } });
              }
            },
            onDrop: (event) => {
              if (drag === null || !event.dataTransfer.types.includes(PHOTO_DRAG_TYPE)) return;
              event.preventDefault();
              const to = drag.over ? dropIndex(photos, drag.id, drag.over.id, drag.over.side) : null;
              setDrag(null);
              if (to !== null) onMove(drag.id, to);
            },
            onDragEnd: () => setDrag(null),
          }}
          onMove={(to, control) => onMove(photo.id, to, control)}
          onDelete={() => onDelete(photo.id)}
          onDeleted={() => onDeleted(index)}
        />
      ))}
    </ul>
  );
};
