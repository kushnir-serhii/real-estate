import { afterEach, describe, expect, it, vi } from "vitest";

import { setTurnstileToken, takeTurnstileToken, waitForTurnstileToken } from "./assistant-turnstile-token";

afterEach(() => {
  setTurnstileToken(null);
  vi.useRealTimers();
});

describe("Turnstile token", () => {
  it("is single-use", () => {
    setTurnstileToken("a");
    expect(takeTurnstileToken()).toBe("a");
    expect(takeTurnstileToken()).toBeNull();
  });

  it("goes straight to a message waiting for it", async () => {
    const waiting = waitForTurnstileToken(new AbortController().signal);
    setTurnstileToken("b");
    await expect(waiting).resolves.toBe("b");
    expect(takeTurnstileToken()).toBeNull();
  });

  it("uses a token that is already there", async () => {
    setTurnstileToken("c");
    await expect(waitForTurnstileToken(new AbortController().signal)).resolves.toBe("c");
  });

  it("gives up after the timeout or an abort", async () => {
    vi.useFakeTimers();
    const timedOut = waitForTurnstileToken(new AbortController().signal, 1000);
    vi.advanceTimersByTime(1000);
    await expect(timedOut).resolves.toBeNull();

    const controller = new AbortController();
    const aborted = waitForTurnstileToken(controller.signal, 1000);
    controller.abort();
    await expect(aborted).resolves.toBeNull();
    // Nobody waits any more: the next token is kept for the next message.
    setTurnstileToken("d");
    expect(takeTurnstileToken()).toBe("d");
  });
});
