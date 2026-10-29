"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { AdminPropertyPhoto } from "@/lib/db/admin-properties";
import { deletePhoto, reorderPhotos } from "../photo-actions";
import type { PhotoActionResult } from "../photo-actions";
import { movePhoto, orderPayload, sameOrder } from "./photo-order";

type Op =
  /** Save the current local order (payload read when it runs, so repeated moves collapse into one). */
  | { kind: "order" }
  | { kind: "delete"; id: string; done: (result: PhotoActionResult) => void };

type PhotoListCallbacks = {
  /** Any successful write (the page refreshes the publish card and header). */
  onSaved: () => void;
  /** A failed order save: the list is already back to the stored order. */
  onOrderError: (message: string) => void;
};

const OFFLINE: PhotoActionResult = { ok: false, message: "Немає зв'язку з сервером. Спробуйте ще раз." };

const ids = (photos: readonly AdminPropertyPhoto[]) => photos.map((photo) => photo.id);

/**
 * The photo list with optimistic moves. Writes run one at a time in click order; the order is sent as a whole
 * (`reorderPhotos`), a failure rolls the list back to the last stored order. Deletes wait for the server.
 */
export const usePhotoList = (propertyId: string, initial: readonly AdminPropertyPhoto[], callbacks: PhotoListCallbacks) => {
  const [photos, setPhotos] = useState<readonly AdminPropertyPhoto[]>(initial);
  const localRef = useRef<readonly AdminPropertyPhoto[]>(initial);
  /** What the server has, as far as we know. */
  const storedRef = useRef<readonly AdminPropertyPhoto[]>(initial);
  const opsRef = useRef<Op[]>([]);
  const runningRef = useRef(false);
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  const commit = useCallback((next: readonly AdminPropertyPhoto[]) => {
    localRef.current = next;
    setPhotos(next);
  }, []);

  const run = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    try {
      for (let op = opsRef.current.shift(); op; op = opsRef.current.shift()) {
        switch (op.kind) {
          case "order": {
            const stored = storedRef.current;
            const payload = orderPayload(ids(localRef.current), ids(stored));
            if (sameOrder(payload, ids(stored))) break;
            const result = await reorderPhotos(propertyId, payload).catch((): PhotoActionResult => OFFLINE);
            if (result.ok) {
              const byId = new Map(stored.map((photo) => [photo.id, photo]));
              storedRef.current = payload.flatMap((id) => byId.get(id) ?? []);
              callbacksRef.current.onSaved();
            } else {
              // Later writes were planned on top of this one: drop them and show what is stored.
              for (const dropped of opsRef.current.splice(0)) {
                if (dropped.kind === "delete") dropped.done(result);
              }
              commit(storedRef.current);
              callbacksRef.current.onOrderError(result.message);
            }
            break;
          }
          case "delete": {
            const result = await deletePhoto(propertyId, op.id).catch((): PhotoActionResult => OFFLINE);
            if (result.ok) {
              const id = op.id;
              storedRef.current = storedRef.current.filter((photo) => photo.id !== id);
              commit(localRef.current.filter((photo) => photo.id !== id));
              callbacksRef.current.onSaved();
            }
            op.done(result);
            break;
          }
          default: {
            const unreachable: never = op;
            return unreachable;
          }
        }
      }
    } finally {
      runningRef.current = false;
    }
  }, [commit, propertyId]);

  const enqueue = useCallback(
    (op: Op) => {
      const last = opsRef.current.at(-1);
      if (!(op.kind === "order" && last?.kind === "order")) opsRef.current.push(op);
      void run();
    },
    [run],
  );

  /** Moves locally right away and saves in the background. */
  const move = useCallback(
    (id: string, toIndex: number) => {
      commit(movePhoto(localRef.current, id, toIndex));
      enqueue({ kind: "order" });
    },
    [commit, enqueue],
  );

  /** Resolves once the server answered; the photo leaves the list only on success. */
  const remove = useCallback(
    (id: string) => new Promise<PhotoActionResult>((done) => enqueue({ kind: "delete", id, done })),
    [enqueue],
  );

  /** A photo the upload route just stored (appended at the end there too). */
  const append = useCallback(
    (photo: AdminPropertyPhoto) => {
      if (localRef.current.some((existing) => existing.id === photo.id)) return;
      storedRef.current = [...storedRef.current, photo];
      commit([...localRef.current, photo]);
    },
    [commit],
  );

  return { photos, move, remove, append };
};
