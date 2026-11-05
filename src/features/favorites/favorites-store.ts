import { useSyncExternalStore } from "react";

import { LEGACY_STORAGE_PREFIX } from "@/lib/legacy-storage";

/** localStorage key: JSON array of property ids (uuids), newest first. */
export const FAVORITES_KEY = "7sky:favorites";
/** Key used before the rebrand; read once and moved to FAVORITES_KEY. */
const LEGACY_FAVORITES_KEY = `${LEGACY_STORAGE_PREFIX}:favorites`;
export const MAX_FAVORITES = 100;

// A plain regex instead of zod: this store ships in the header of every page, and zod would add ~100 KB of JS there.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EMPTY: readonly string[] = [];

// The list lives in memory so the hearts keep working when storage is blocked (private mode, policies).
let current: readonly string[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

/** Valid, unique ids from an unknown value; anything else (malformed JSON, foreign data) is dropped. */
export const sanitizeIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item === "string" && UUID_PATTERN.test(item)) seen.add(item);
    if (seen.size >= MAX_FAVORITES) break;
  }
  return [...seen];
};

/** Moves the pre-rebrand list to the new key once; unreadable data is dropped. Throws only when storage is blocked. */
const migrateLegacy = (): string[] => {
  const legacy = window.localStorage.getItem(LEGACY_FAVORITES_KEY);
  if (legacy === null) return [];
  let ids: string[] = [];
  try {
    ids = sanitizeIds(JSON.parse(legacy));
  } catch {
    // Garbage: start empty.
  }
  window.localStorage.removeItem(LEGACY_FAVORITES_KEY);
  if (ids.length > 0) window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  return ids;
};

/** `null` when storage can't be read at all. */
const readStorage = (): string[] | null => {
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (raw !== null) return sanitizeIds(JSON.parse(raw));
    return migrateLegacy();
  } catch {
    return null;
  }
};

const writeStorage = (ids: readonly string[]) => {
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  } catch {
    // Blocked or full: the session list in memory still works.
  }
};

const emit = () => listeners.forEach((listener) => listener());

const set = (ids: readonly string[]) => {
  current = ids;
  loaded = true;
  writeStorage(ids);
  emit();
};

const getSnapshot = (): readonly string[] => {
  if (!loaded) {
    current = readStorage() ?? EMPTY;
    loaded = true;
  }
  return current;
};

const getServerSnapshot = (): readonly string[] => EMPTY;

const sameIds = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id, index) => id === b[index]);

// Another tab changed the list.
const onStorage = (event: StorageEvent) => {
  if (event.key !== null && event.key !== FAVORITES_KEY) return;
  const next = readStorage();
  if (next === null || sameIds(next, current)) return;
  current = next;
  loaded = true;
  emit();
};

const subscribe = (listener: () => void) => {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
};

/** Saved ids, newest first. Empty on the server and during hydration. */
export const useFavorites = (): readonly string[] =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

export const useIsFavorite = (id: string): boolean => useFavorites().includes(id);

/** Adds the id (returns true) or removes it (returns false). */
export const toggleFavorite = (id: string): boolean => {
  const ids = getSnapshot();
  if (ids.includes(id)) {
    set(ids.filter((item) => item !== id));
    return false;
  }
  set([id, ...ids].slice(0, MAX_FAVORITES));
  return true;
};

export const removeFavorite = (id: string) => {
  const ids = getSnapshot();
  if (ids.includes(id)) set(ids.filter((item) => item !== id));
};

const subscribeNever = () => () => {};

/** False on the server and during hydration, true after: tells «not read yet» from «empty». */
export const useHydrated = (): boolean => useSyncExternalStore(subscribeNever, () => true, () => false);
