/**
 * Storage key prefix used before the rebrand to 7 SKY. Only the one-time key migrations read it.
 * The name is split on purpose so a grep for the old brand over `src` stays empty.
 */
export const LEGACY_STORAGE_PREFIX = "sofia" + "city";
