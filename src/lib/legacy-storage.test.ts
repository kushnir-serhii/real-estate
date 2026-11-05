import { afterEach, describe, expect, it, vi } from "vitest";

import { readStoredChat, CHAT_STORAGE_KEY } from "@/features/assistant/chat-storage";
import { LEGACY_STORAGE_PREFIX } from "@/lib/legacy-storage";
import { LEGACY_THEME_STORAGE_KEY, THEME_STORAGE_KEY, readStoredTheme } from "@/lib/theme";

const fakeStorage = (initial: Record<string, string>) => {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
};

afterEach(() => vi.unstubAllGlobals());

describe("theme key migration", () => {
  it("moves a valid old value once", () => {
    const ls = fakeStorage({ [LEGACY_THEME_STORAGE_KEY]: "dark" });
    vi.stubGlobal("localStorage", ls);
    expect(readStoredTheme()).toBe("dark");
    expect(ls.data.get(THEME_STORAGE_KEY)).toBe("dark");
    expect(ls.data.has(LEGACY_THEME_STORAGE_KEY)).toBe(false);
  });

  it("ignores garbage in the old key", () => {
    const ls = fakeStorage({ [LEGACY_THEME_STORAGE_KEY]: "purple" });
    vi.stubGlobal("localStorage", ls);
    expect(readStoredTheme()).toBe("system");
    expect(ls.data.has(THEME_STORAGE_KEY)).toBe(false);
  });

  it("prefers the new key", () => {
    vi.stubGlobal("localStorage", fakeStorage({ [THEME_STORAGE_KEY]: "light", [LEGACY_THEME_STORAGE_KEY]: "dark" }));
    expect(readStoredTheme()).toBe("light");
  });
});

describe("chat key migration", () => {
  const legacyKey = `${LEGACY_STORAGE_PREFIX}:assistant-chat`;

  it("carries an old chat over to the new key", () => {
    const raw = JSON.stringify({
      conversationId: null,
      messages: [{ id: "1", role: "user", text: "Привіт" }],
    });
    const ss = fakeStorage({ [legacyKey]: raw });
    vi.stubGlobal("window", { sessionStorage: ss });
    expect(readStoredChat().messages).toHaveLength(1);
    expect(ss.data.get(CHAT_STORAGE_KEY)).toBe(raw);
    expect(ss.data.has(legacyKey)).toBe(false);
  });

  it("drops a garbage old value", () => {
    const ss = fakeStorage({ [legacyKey]: "{not json" });
    vi.stubGlobal("window", { sessionStorage: ss });
    expect(readStoredChat().messages).toHaveLength(0);
    expect(ss.data.has(CHAT_STORAGE_KEY)).toBe(false);
    expect(ss.data.has(legacyKey)).toBe(false);
  });
});
