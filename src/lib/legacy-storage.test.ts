import { afterEach, describe, expect, it, vi } from "vitest";

import { readStoredChat, CHAT_STORAGE_KEY } from "@/features/assistant/chat-storage";
import { FAVORITES_KEY, migrateLegacyFavorites } from "@/features/favorites/favorites-store";
import { LEGACY_STORAGE_PREFIXES, legacyStorageKeys } from "@/lib/legacy-storage";
import { LEGACY_THEME_STORAGE_KEYS, THEME_INIT_SCRIPT, THEME_STORAGE_KEY, readStoredTheme } from "@/lib/theme";

const fakeStorage = (initial: Record<string, string>) => {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
};

const [PREVIOUS, ORIGINAL] = LEGACY_STORAGE_PREFIXES;
const ID_A = "0b6f3c1e-8d2a-4f5b-9c7d-1e2f3a4b5c6d";
const ID_B = "1c7a4d2f-9e3b-4a6c-8d8e-2f3a4b5c6d7e";

afterEach(() => vi.unstubAllGlobals());

describe("legacy keys", () => {
  it("lists both old prefixes, newest first, without the new one", () => {
    expect(legacyStorageKeys(":favorites")).toEqual([`${PREVIOUS}:favorites`, `${ORIGINAL}:favorites`]);
    expect(legacyStorageKeys(":favorites")).not.toContain(FAVORITES_KEY);
  });
});

describe("theme key migration", () => {
  it.each(LEGACY_THEME_STORAGE_KEYS)("moves a valid value from %s once", (key) => {
    const ls = fakeStorage({ [key]: "dark" });
    vi.stubGlobal("localStorage", ls);
    expect(readStoredTheme()).toBe("dark");
    expect(ls.data.get(THEME_STORAGE_KEY)).toBe("dark");
    expect(ls.data.has(key)).toBe(false);
    // The reload after: read from the new key.
    expect(readStoredTheme()).toBe("dark");
  });

  it("prefers the newer old key and clears both", () => {
    const [newer, older] = LEGACY_THEME_STORAGE_KEYS;
    const ls = fakeStorage({ [newer]: "light", [older]: "dark" });
    vi.stubGlobal("localStorage", ls);
    expect(readStoredTheme()).toBe("light");
    expect([...ls.data.keys()]).toEqual([THEME_STORAGE_KEY]);
  });

  it("skips garbage in the newer key for a valid older one", () => {
    const [newer, older] = LEGACY_THEME_STORAGE_KEYS;
    vi.stubGlobal("localStorage", fakeStorage({ [newer]: "purple", [older]: "dark" }));
    expect(readStoredTheme()).toBe("dark");
  });

  it("ignores garbage in the old keys", () => {
    const ls = fakeStorage({ [LEGACY_THEME_STORAGE_KEYS[0]]: "purple" });
    vi.stubGlobal("localStorage", ls);
    expect(readStoredTheme()).toBe("system");
    expect(ls.data.has(THEME_STORAGE_KEY)).toBe(false);
  });

  it("prefers the new key", () => {
    vi.stubGlobal("localStorage", fakeStorage({ [THEME_STORAGE_KEY]: "light", [LEGACY_THEME_STORAGE_KEYS[0]]: "dark" }));
    expect(readStoredTheme()).toBe("light");
  });

  it("the inline script (before first paint) migrates the same way", () => {
    const ls = fakeStorage({ [LEGACY_THEME_STORAGE_KEYS[0]]: "purple", [LEGACY_THEME_STORAGE_KEYS[1]]: "dark" });
    const classes = new Set<string>();
    const html = { classList: { toggle: (name: string, on: boolean) => void (on ? classes.add(name) : classes.delete(name)) } };
    vi.stubGlobal("localStorage", ls);
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
    vi.stubGlobal("document", { documentElement: html });
    new Function(THEME_INIT_SCRIPT)();
    expect(classes.has("dark")).toBe(true);
    expect([...ls.data.entries()]).toEqual([[THEME_STORAGE_KEY, "dark"]]);
  });
});

describe("favorites key migration", () => {
  it.each(LEGACY_STORAGE_PREFIXES)("carries the list saved under %s over to the new key", (prefix) => {
    const legacyKey = `${prefix}:favorites`;
    const ls = fakeStorage({ [legacyKey]: JSON.stringify([ID_A, ID_B]) });
    vi.stubGlobal("window", { localStorage: ls });
    expect(migrateLegacyFavorites()).toEqual([ID_A, ID_B]);
    expect(ls.data.get(FAVORITES_KEY)).toBe(JSON.stringify([ID_A, ID_B]));
    expect(ls.data.has(legacyKey)).toBe(false);
  });

  it("takes the newer list, falls back to the older one when the newer is garbage", () => {
    const ls = fakeStorage({ [`${PREVIOUS}:favorites`]: "{not json", [`${ORIGINAL}:favorites`]: JSON.stringify([ID_B]) });
    vi.stubGlobal("window", { localStorage: ls });
    expect(migrateLegacyFavorites()).toEqual([ID_B]);
    expect([...ls.data.keys()]).toEqual([FAVORITES_KEY]);
  });

  it("drops garbage and writes nothing", () => {
    const ls = fakeStorage({ [`${PREVIOUS}:favorites`]: JSON.stringify(["not-a-uuid"]) });
    vi.stubGlobal("window", { localStorage: ls });
    expect(migrateLegacyFavorites()).toEqual([]);
    expect(ls.data.size).toBe(0);
  });
});

describe("chat key migration", () => {
  const raw = JSON.stringify({
    conversationId: null,
    messages: [{ id: "1", role: "user", text: "Привіт" }],
  });

  it.each(LEGACY_STORAGE_PREFIXES)("carries an old chat saved under %s over to the new key", (prefix) => {
    const legacyKey = `${prefix}:assistant-chat`;
    const ss = fakeStorage({ [legacyKey]: raw });
    vi.stubGlobal("window", { sessionStorage: ss });
    expect(readStoredChat().messages).toHaveLength(1);
    expect(ss.data.get(CHAT_STORAGE_KEY)).toBe(raw);
    expect(ss.data.has(legacyKey)).toBe(false);
  });

  it("drops a garbage old value", () => {
    const legacyKey = `${PREVIOUS}:assistant-chat`;
    const ss = fakeStorage({ [legacyKey]: "{not json" });
    vi.stubGlobal("window", { sessionStorage: ss });
    expect(readStoredChat().messages).toHaveLength(0);
    expect(ss.data.has(CHAT_STORAGE_KEY)).toBe(false);
    expect(ss.data.has(legacyKey)).toBe(false);
  });
});
