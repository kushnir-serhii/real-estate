import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ cleanupAssistant: vi.fn() }));
vi.mock("@/features/assistant/cleanup-assistant", () => ({ cleanupAssistant: mocks.cleanupAssistant }));

import { POST } from "./route";

const request = (token?: string) =>
  new Request("http://localhost/api/cron/assistant", {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", "s3cret");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("POST /api/cron/assistant", () => {
  it("refuses a missing or wrong secret without deleting", async () => {
    expect((await POST(request())).status).toBe(401);
    expect((await POST(request("nope"))).status).toBe(401);
    expect(mocks.cleanupAssistant).not.toHaveBeenCalled();
  });

  it("deletes and returns the count with the right secret", async () => {
    mocks.cleanupAssistant.mockResolvedValue({ deleted: 3, usageDeleted: 0 });
    const response = await POST(request("s3cret"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ deleted: 3 });
  });

  it("answers 500 when the cleanup fails", async () => {
    mocks.cleanupAssistant.mockRejectedValue(new Error("db"));
    expect((await POST(request("s3cret"))).status).toBe(500);
  });
});
