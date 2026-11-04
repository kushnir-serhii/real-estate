import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ deleteConversationsBefore: vi.fn(), deleteUsageBefore: vi.fn() }));
vi.mock("@/lib/db/assistant", () => db);

import { cleanupAssistant } from "./cleanup-assistant";

beforeEach(() => {
  vi.clearAllMocks();
  db.deleteConversationsBefore.mockResolvedValue(4);
  db.deleteUsageBefore.mockResolvedValue(1);
});

describe("cleanupAssistant", () => {
  it("deletes conversations older than 30 days and usage older than 13 months", async () => {
    const result = await cleanupAssistant(new Date("2026-11-04T00:00:00Z"));
    expect(result).toEqual({ deleted: 4, usageDeleted: 1 });
    expect(db.deleteConversationsBefore).toHaveBeenCalledWith("2026-10-05T00:00:00.000Z");
    expect(db.deleteUsageBefore).toHaveBeenCalledWith("2025-10-01");
  });
});
