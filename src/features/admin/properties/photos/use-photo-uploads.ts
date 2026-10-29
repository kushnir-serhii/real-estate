"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { createPhotoUploadQueue, getEmptyUploads } from "./photo-upload-queue";
import type { PhotoUploadQueue, UploadEvent, UploadItem } from "./photo-upload-queue";

/** The upload queue of one property, its items for rendering, and its events (uploaded / failed). */
export const usePhotoUploads = (
  propertyId: string,
  onEvent: (event: UploadEvent) => void,
): { items: readonly UploadItem[]; queue: PhotoUploadQueue } => {
  const [queue] = useState(() => createPhotoUploadQueue(propertyId));
  const items = useSyncExternalStore(queue.subscribe, queue.getSnapshot, getEmptyUploads);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  });

  useEffect(() => queue.onEvent((event) => onEventRef.current(event)), [queue]);

  return { items, queue };
};
