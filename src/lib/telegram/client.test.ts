import { afterEach, describe, expect, it, vi } from "vitest";

import { isTelegramError, resolveTelegramMode, sendTelegramMessageWith } from "./index";

const live = { botToken: "123:SECRET", chatId: "-100" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => vi.restoreAllMocks());

describe("resolveTelegramMode", () => {
  it("is off without token or chat id, live with both, fixture wins", () => {
    expect(resolveTelegramMode({})).toBe("off");
    expect(resolveTelegramMode({ botToken: "t" })).toBe("off");
    expect(resolveTelegramMode(live)).toBe("live");
    expect(resolveTelegramMode({ fixture: "ok" })).toEqual({ fixture: "ok" });
  });
});

describe("sendTelegramMessageWith", () => {
  it("posts an HTML message to the chat", async () => {
    const fetchMock = vi.fn(async () => json({ ok: true, result: {} }));
    await sendTelegramMessageWith({ ...live, fetch: fetchMock }, { text: "<b>hi</b>" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.telegram.org/bot123:SECRET/sendMessage");
    expect(JSON.parse(String(init.body))).toEqual({
      chat_id: "-100",
      text: "<b>hi</b>",
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  });

  it("throws typed errors that never contain the token", async () => {
    const outcomes: Array<() => Promise<Response>> = [
      async () => json({ ok: false }, 400),
      async () => json({ ok: false }),
      async () => {
        throw new Error("fetch failed for https://api.telegram.org/bot123:SECRET/sendMessage");
      },
    ];
    const kinds: string[] = [];
    for (const outcome of outcomes) {
      const error = await sendTelegramMessageWith({ ...live, fetch: outcome }, { text: "x" }).then(
        () => null,
        (caught: unknown) => caught,
      );
      expect(isTelegramError(error)).toBe(true);
      if (!isTelegramError(error)) continue;
      expect(error.message).not.toContain("SECRET");
      kinds.push(error.kind);
    }
    expect(kinds).toEqual(["http", "invalid_response", "network"]);
  });

  it("fixture ok logs without personal data, fixture fail throws, off throws", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    await sendTelegramMessageWith({ fixture: "ok" }, { text: "Іван +380501234567" });
    expect(info).toHaveBeenCalledWith("[telegram fixture] message would be sent (18 chars)");
    await expect(sendTelegramMessageWith({ fixture: "fail" }, { text: "x" })).rejects.toThrow();
    await expect(sendTelegramMessageWith({}, { text: "x" })).rejects.toThrow();
  });
});
