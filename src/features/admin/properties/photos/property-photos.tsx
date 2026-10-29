"use client";

import { CircleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { AdminPropertyPhoto } from "@/lib/db/admin-properties";
import { PropertyFormSection } from "../property-form-section";
import { freeSlots } from "./photo-file-check";
import { PhotoDropZone } from "./photo-drop-zone";
import { PhotoGrid } from "./photo-grid";
import { MAX_PHOTOS } from "./photo-limits";
import type { PhotoControl } from "./photo-tile";
import { isActiveUpload } from "./photo-upload-queue";
import type { UploadEvent, UploadItem } from "./photo-upload-queue";
import { PhotoUploadList } from "./photo-upload-list";
import { usePhotoList } from "./use-photo-list";
import { usePhotoUploads } from "./use-photo-uploads";

type PropertyPhotosProps = {
  propertyId: string;
  /** Stored photos, cover first. Read once: afterwards this component keeps the list. */
  photos: readonly AdminPropertyPhoto[];
};

type FocusRequest =
  | { kind: "control"; photoId: string; control: PhotoControl }
  | { kind: "after-delete"; index: number };

/** Waits for a burst of changes (several uploads finishing) before refreshing the server parts of the page. */
const REFRESH_DELAY_MS = 400;

const firstEnabledButton = (root: Element | null | undefined): HTMLButtonElement | null =>
  root?.querySelector<HTMLButtonElement>("button:not(:disabled)") ?? null;

const moveFocus = (grid: HTMLUListElement | null, add: HTMLButtonElement | null, request: FocusRequest) => {
  switch (request.kind) {
    case "control": {
      const tile = grid?.querySelector(`[data-photo-id="${CSS.escape(request.photoId)}"]`);
      const target =
        tile?.querySelector<HTMLButtonElement>(`[data-photo-control="${request.control}"]:not(:disabled)`) ??
        firstEnabledButton(tile);
      target?.focus();
      return;
    }
    case "after-delete": {
      const tiles = grid ? [...grid.querySelectorAll("[data-photo-id]")] : [];
      const target = firstEnabledButton(tiles[request.index] ?? tiles.at(-1)) ?? (add?.disabled ? null : add);
      target?.focus();
      return;
    }
    default: {
      const unreachable: never = request;
      return unreachable;
    }
  }
};

const uploadSummary = (items: readonly UploadItem[]): string => {
  if (items.length === 0) return "";
  const done = items.filter((item) => item.status === "done").length;
  const failed = items.filter((item) => item.status === "failed").length;
  const active = items.some(isActiveUpload);
  const base = `Завантажено ${done} з ${items.length}`;
  if (active) return `${base}…`;
  return failed > 0 ? `${base}. Не вдалося: ${failed}.` : `${base}. Готово.`;
};

/** The «Фото» section of the edit page: add (resize in the browser, upload), reorder, cover, delete. */
export const PropertyPhotos = ({ propertyId, photos: initial }: PropertyPhotosProps) => {
  const router = useRouter();
  const gridRef = useRef<HTMLUListElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [error, setError] = useState("");
  /** Upload failures are shown in their row; this only reads them out. */
  const [uploadAlert, setUploadAlert] = useState("");
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const [fileOver, setFileOver] = useState(false);

  /** The publish card («no photos») and the public page read the stored photos. */
  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => router.refresh(), REFRESH_DELAY_MS);
  }, [router]);

  useEffect(
    () => () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    },
    [],
  );

  const list = usePhotoList(propertyId, initial, {
    onSaved: scheduleRefresh,
    onOrderError: (message) => {
      setAnnouncement("");
      setError(`Порядок фото не збережено, повернули як було. ${message}`);
    },
  });
  const { photos } = list;

  const onUploadEvent = (event: UploadEvent) => {
    switch (event.type) {
      case "uploaded":
        list.append(event.photo);
        scheduleRefresh();
        return;
      case "failed":
        setUploadAlert(`«${event.name}» не додано. ${event.message}`);
        return;
      default: {
        const unreachable: never = event;
        return unreachable;
      }
    }
  };
  const { items, queue } = usePhotoUploads(propertyId, onUploadEvent);

  const activeUploads = items.filter(isActiveUpload).length;
  const full = freeSlots(photos.length, activeUploads) === 0;

  // Moving a focused button through the DOM drops the focus: put it back where the user was.
  useEffect(() => {
    if (focusRequest === null) return;
    // After Radix returns the focus from a closed dialog (it does so on the next tick).
    const timer = setTimeout(() => moveFocus(gridRef.current, addRef.current, focusRequest), 0);
    return () => clearTimeout(timer);
  }, [focusRequest]);

  // Leaving while photos are still being processed or sent loses them.
  useEffect(() => {
    if (activeUploads === 0) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [activeUploads]);

  const addFiles = (files: File[]) => {
    if (files.length === 0) return;
    setError("");
    setUploadAlert("");
    const { skipped } = queue.add(files, photos.length);
    if (skipped > 0) {
      setError(`Не всі файли додано: до одного об'єкта можна до ${MAX_PHOTOS} фото. Пропущено: ${skipped}.`);
    }
  };

  const onMove = (id: string, toIndex: number, control?: PhotoControl) => {
    setError("");
    list.move(id, toIndex);
    setAnnouncement(
      toIndex === 0 ? "Фото стало обкладинкою." : `Фото переміщено на ${toIndex + 1} місце з ${photos.length}.`,
    );
    if (control) setFocusRequest({ kind: "control", photoId: id, control });
  };

  const onDeleted = (index: number) => {
    setError("");
    setAnnouncement("Фото видалено.");
    setFocusRequest({ kind: "after-delete", index });
  };

  const hasFiles = (event: React.DragEvent) => event.dataTransfer.types.includes("Files");

  return (
    <PropertyFormSection
      id="photos"
      title="Фото"
      description={
        <>
          Перше фото — обкладинка в каталозі. Зміни зберігаються одразу, окремо від форми.
          <span className="hidden pointer-fine:inline"> Порядок можна змінити, перетягнувши фото мишею.</span>
        </>
      }
    >
      <div
        className="flex min-w-0 flex-col gap-4"
        onDragOver={(event) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = full ? "none" : "copy";
          if (!fileOver) setFileOver(true);
        }}
        onDragLeave={(event) => {
          if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
          setFileOver(false);
        }}
        onDrop={(event) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          setFileOver(false);
          addFiles([...event.dataTransfer.files]);
        }}
      >
        <p className="text-sm text-muted-foreground">
          Фото: <span className="font-medium text-foreground tabular-nums">{photos.length} з {MAX_PHOTOS}</span>
        </p>

        <PhotoDropZone fileOver={fileOver} full={full} onFiles={addFiles} buttonRef={addRef} />

        {/* Always mounted: a live region that appears together with its text is often not read out. */}
        <p role="status" className="-mb-2 text-sm font-medium empty:hidden">
          {uploadSummary(items)}
        </p>
        {items.length > 0 && (
          <div className="flex flex-col items-end gap-1">
            <PhotoUploadList items={items} onRetry={queue.retry} onDismiss={queue.dismiss} />
            {activeUploads === 0 && (
              <Button type="button" variant="ghost" onClick={queue.clearFinished}>
                Очистити список
              </Button>
            )}
          </div>
        )}

        <p role="status" className="sr-only">
          {announcement}
        </p>
        <p role="alert" className="sr-only">
          {uploadAlert}
        </p>
        <p role="alert" className="flex items-start gap-1.5 text-sm font-medium wrap-anywhere text-destructive empty:hidden">
          {error && (
            <>
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {error}
            </>
          )}
        </p>

        {photos.length > 0 ? (
          <PhotoGrid
            ref={gridRef}
            photos={photos}
            onMove={onMove}
            onDelete={list.remove}
            onDeleted={onDeleted}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Фото ще немає. Додайте хоча б кілька: з ними оголошення помітніше в каталозі.
          </p>
        )}
      </div>
    </PropertyFormSection>
  );
};
