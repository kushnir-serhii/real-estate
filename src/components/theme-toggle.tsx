"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  THEME_STORAGE_KEY,
  applyTheme,
  readStoredTheme,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

const THEME_EVENT = "7sky-theme-change";

const subscribe = (onChange: () => void) => {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  // Follow the OS while "system" is stored.
  const onMedia = () => {
    if (readStoredTheme() === "system") applyTheme("system");
    onChange();
  };
  window.addEventListener("storage", onChange);
  window.addEventListener(THEME_EVENT, onChange);
  media.addEventListener("change", onMedia);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(THEME_EVENT, onChange);
    media.removeEventListener("change", onMedia);
  };
};

// The resolved theme is the `dark` class that THEME_INIT_SCRIPT / applyTheme put on <html>.
const getIsDark = () => document.documentElement.classList.contains("dark");

type ThemeToggleProps = { className?: string };

/** One button, light <-> dark. Both icons are always rendered and swapped with CSS (`dark:`), so the server HTML never shows the wrong one. */
export const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const isDark = useSyncExternalStore(subscribe, getIsDark, () => false);
  const label = isDark ? "Увімкнути світлу тему" : "Увімкнути темну тему";

  const toggle = () => {
    // from "system" too: go to the opposite of what is shown now
    const next = getIsDark() ? "light" : "dark";
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // storage unavailable (private mode): the choice lasts until reload
    }
    applyTheme(next);
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      onClick={toggle}
      className={cn("relative", className)}
    >
      <Sun
        aria-hidden="true"
        className="transition-[transform,opacity] duration-(--duration-base) ease-out-soft dark:-rotate-90 dark:scale-50 dark:opacity-0 motion-reduce:transition-none"
      />
      <Moon
        aria-hidden="true"
        className="absolute rotate-90 scale-50 opacity-0 transition-[transform,opacity] duration-(--duration-base) ease-out-soft dark:rotate-0 dark:scale-100 dark:opacity-100 motion-reduce:transition-none"
      />
    </Button>
  );
};
