import { legacyStorageKeys, takeLegacyValue } from "@/lib/legacy-storage";

export const THEME_STORAGE_KEY = "diplomat-hall-theme";
const LEGACY_THEME_SUFFIX = "-theme";
/** Keys used before the rebrands, newest first; read once and moved to THEME_STORAGE_KEY. */
export const LEGACY_THEME_STORAGE_KEYS = legacyStorageKeys(LEGACY_THEME_SUFFIX);

export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

export const isTheme = (value: unknown): value is Theme =>
  THEMES.some((theme) => theme === value);

/**
 * Runs before first paint: sets the `dark` class on <html>. Keep in sync with readStoredTheme and applyTheme.
 * It also does the one-time move from the old keys (same rule as takeLegacyValue: the newest valid value
 * wins, every old key is removed), so a theme saved under an old key shows without a flash.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=null;try{t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t===null){var k=${JSON.stringify(LEGACY_THEME_STORAGE_KEYS)};for(var i=0;i<k.length;i++){var o=localStorage.getItem(k[i]);if(o===null)continue;if(t===null&&(o==="light"||o==="dark"||o==="system")){t=o;localStorage.setItem("${THEME_STORAGE_KEY}",o)}localStorage.removeItem(k[i])}}}catch(e){}var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

export const readStoredTheme = (): Theme => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored !== null) return isTheme(stored) ? stored : "system";
    // One-time move from the pre-rebrand keys; garbage is dropped.
    const legacy = takeLegacyValue(localStorage, LEGACY_THEME_SUFFIX, isTheme);
    if (legacy === null || !isTheme(legacy)) return "system";
    localStorage.setItem(THEME_STORAGE_KEY, legacy);
    return legacy;
  } catch {
    return "system";
  }
};

export const applyTheme = (theme: Theme) => {
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
};
