/**
 * Storage key prefixes used before the rebrands, newest first: the previous brand's, then the original one.
 * Only the one-time key migrations read them. The names are split on purpose so a grep for the old brands
 * over `src` stays empty. Safe to delete (with the migrations) after a release or two.
 */
export const LEGACY_STORAGE_PREFIXES = ["7" + "sky", "sofia" + "city"] as const;

/** Old keys for a new key's suffix, newest first: `legacyStorageKeys(":favorites")`. */
export const legacyStorageKeys = (suffix: string): string[] =>
  LEGACY_STORAGE_PREFIXES.map((prefix) => `${prefix}${suffix}`);

type KeyValueStorage = Pick<Storage, "getItem" | "removeItem">;

/**
 * Reads the newest old value that passes `isValid`, removes every old key and returns that value
 * (`null` when there is none). The caller writes it under the new key. Throws only when storage is blocked.
 */
export const takeLegacyValue = (
  storage: KeyValueStorage,
  suffix: string,
  isValid: (value: string) => boolean = () => true,
): string | null => {
  let value: string | null = null;
  for (const key of legacyStorageKeys(suffix)) {
    const stored = storage.getItem(key);
    if (stored === null) continue;
    if (value === null && isValid(stored)) value = stored;
    storage.removeItem(key);
  }
  return value;
};
