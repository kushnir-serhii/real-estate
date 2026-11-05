import { LEGACY_STORAGE_PREFIX } from "@/lib/legacy-storage";

export const THEME_STORAGE_KEY = "7sky-theme";
/** Key used before the rebrand; read once and moved to THEME_STORAGE_KEY. Safe to delete after a release or two. */
export const LEGACY_THEME_STORAGE_KEY = `${LEGACY_STORAGE_PREFIX}-theme`;

export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

export const isTheme = (value: unknown): value is Theme =>
  THEMES.some((theme) => theme === value);

/** Runs before first paint: sets the `dark` class on <html>. Keep in sync with applyTheme. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=null;try{t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t===null){var o=localStorage.getItem("${LEGACY_THEME_STORAGE_KEY}");if(o==="light"||o==="dark"||o==="system"){t=o;localStorage.setItem("${THEME_STORAGE_KEY}",o)}if(o!==null)localStorage.removeItem("${LEGACY_THEME_STORAGE_KEY}")}}catch(e){}var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

export const readStoredTheme = (): Theme => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored !== null) return isTheme(stored) ? stored : "system";
    // One-time move from the pre-rebrand key; garbage is dropped.
    const legacy = localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    if (legacy === null) return "system";
    localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
    if (!isTheme(legacy)) return "system";
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
