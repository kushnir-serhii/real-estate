import { checkPhotoFile, freeSlots } from "./photo-file-check";
import type { UploadedPhoto } from "./photo-limits";
import { resizePhoto, yieldToBrowser } from "./photo-resize";
import type { ResizeResult, ResizedPhoto } from "./photo-resize";
import { sendPhoto } from "./send-photo";

/**
 * Browser-only store of the files being added: one file is resized at a time (keeps the tab responsive with
 * 10+ MB photos), at most MAX_PARALLEL_UPLOADS are sent. Read through `useSyncExternalStore`.
 */

export const MAX_PARALLEL_UPLOADS = 2;

export type UploadItemState =
  | { status: "queued" }
  | { status: "processing" }
  /** Resized, waiting for an upload slot. */
  | { status: "waiting" }
  | { status: "uploading"; progress: number }
  | { status: "done" }
  | { status: "failed"; message: string; canRetry: boolean };

export type UploadItem = { id: string; name: string } & UploadItemState;

export type UploadEvent =
  | { type: "uploaded"; photo: UploadedPhoto }
  | { type: "failed"; name: string; message: string };

export type PhotoUploadQueue = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => readonly UploadItem[];
  onEvent: (listener: (event: UploadEvent) => void) => () => void;
  /** Queues what fits next to `stored` photos; returns how many files didn't fit. */
  add: (files: readonly File[], stored: number) => { skipped: number };
  retry: (id: string) => void;
  dismiss: (id: string) => void;
  /** Drops finished items (done and failed). */
  clearFinished: () => void;
};

type Entry = { id: string; file: File; resized: ResizedPhoto | null; item: UploadItem };

export const isActiveUpload = (item: UploadItem): boolean => {
  switch (item.status) {
    case "queued":
    case "processing":
    case "waiting":
    case "uploading":
      return true;
    case "done":
    case "failed":
      return false;
    default: {
      const unreachable: never = item;
      return unreachable;
    }
  }
};

const EMPTY: readonly UploadItem[] = [];
export const getEmptyUploads = (): readonly UploadItem[] => EMPTY;

export const createPhotoUploadQueue = (propertyId: string): PhotoUploadQueue => {
  let entries: Entry[] = [];
  let snapshot: readonly UploadItem[] = EMPTY;
  const listeners = new Set<() => void>();
  const eventListeners = new Set<(event: UploadEvent) => void>();
  let processing = false;
  let uploading = 0;
  let sequence = 0;

  const emit = () => {
    snapshot = entries.map((entry) => entry.item);
    for (const listener of listeners) listener();
  };

  const notify = (event: UploadEvent) => {
    for (const listener of eventListeners) listener(event);
  };

  const set = (entry: Entry, state: UploadItemState) => {
    entry.item = { id: entry.id, name: entry.file.name, ...state };
    emit();
  };

  const alive = (entry: Entry) => entries.includes(entry);

  const fail = (entry: Entry, message: string, canRetry: boolean) => {
    if (!alive(entry)) return;
    set(entry, { status: "failed", message, canRetry });
    notify({ type: "failed", name: entry.file.name, message });
  };

  const process = async (entry: Entry) => {
    set(entry, { status: "processing" });
    await yieldToBrowser();
    const result: ResizeResult = await resizePhoto(entry.file);
    processing = false;
    if (alive(entry)) {
      if (result.ok) {
        entry.resized = result.photo;
        set(entry, { status: "waiting" });
      } else {
        fail(entry, result.message, result.canRetry);
      }
    }
    pump();
  };

  const upload = async (entry: Entry, photo: ResizedPhoto) => {
    set(entry, { status: "uploading", progress: 0 });
    const result = await sendPhoto({
      propertyId,
      photo,
      onProgress: (progress) => {
        if (alive(entry) && entry.item.status === "uploading" && entry.item.progress !== progress) {
          set(entry, { status: "uploading", progress });
        }
      },
    });
    uploading -= 1;
    if (result.ok) {
      entry.resized = null;
      if (alive(entry)) set(entry, { status: "done" });
      notify({ type: "uploaded", photo: result.photo });
    } else {
      fail(entry, result.message, result.canRetry);
    }
    pump();
  };

  const pump = () => {
    if (!processing) {
      const next = entries.find((entry) => entry.item.status === "queued");
      if (next) {
        processing = true;
        void process(next);
      }
    }
    while (uploading < MAX_PARALLEL_UPLOADS) {
      const next = entries.find((entry) => entry.item.status === "waiting");
      if (!next) break;
      if (!next.resized) {
        set(next, { status: "queued" });
        continue;
      }
      uploading += 1;
      void upload(next, next.resized);
    }
  };

  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    onEvent: (listener) => {
      eventListeners.add(listener);
      return () => eventListeners.delete(listener);
    },
    add: (files, stored) => {
      // A new batch after the previous one finished: the old «Готово» rows go.
      if (entries.every((entry) => !isActiveUpload(entry.item))) {
        entries = entries.filter((entry) => entry.item.status !== "done");
      }
      let slots = freeSlots(stored, entries.filter((entry) => isActiveUpload(entry.item)).length);
      let skipped = 0;
      for (const file of files) {
        const problem = checkPhotoFile(file);
        if (problem === null && slots === 0) {
          skipped += 1;
          continue;
        }
        sequence += 1;
        const id = `upload-${sequence}`;
        const state: UploadItemState =
          problem === null ? { status: "queued" } : { status: "failed", message: problem, canRetry: false };
        if (problem === null) slots -= 1;
        entries = [...entries, { id, file, resized: null, item: { id, name: file.name, ...state } }];
      }
      emit();
      pump();
      return { skipped };
    },
    retry: (id) => {
      const entry = entries.find((candidate) => candidate.id === id);
      if (!entry || entry.item.status !== "failed") return;
      set(entry, entry.resized ? { status: "waiting" } : { status: "queued" });
      pump();
    },
    dismiss: (id) => {
      entries = entries.filter((entry) => entry.id !== id);
      emit();
    },
    clearFinished: () => {
      entries = entries.filter((entry) => isActiveUpload(entry.item));
      emit();
    },
  };
};
