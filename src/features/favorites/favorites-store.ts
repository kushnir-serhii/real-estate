import { useSyncExternalStore } from "react";
import { z } from "zod";

/** localStorage key: JSON array of property ids (uuids), newest first. */
export const FAVORITES_KEY = "lyndrik:favorites";
export const MAX_FAVORITES = 100;

const idSchema = z.string().uuid();

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
    const parsed = idSchema.safeParse(item);
    if (parsed.success) seen.add(parsed.data);
    if (seen.size >= MAX_FAVORITES) break;
  }
  return [...seen];
};

/** `null` when storage can't be read at all. */
const readStorage = (): string[] | null => {
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (raw === null) return [];
    return sanitizeIds(JSON.parse(raw));
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
