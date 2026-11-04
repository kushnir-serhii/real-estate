import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { toTranscript } from "./assistant";

const at = (n: number) => `2026-10-29T10:00:0${n}.000Z`;

describe("toTranscript", () => {
  it("shows user and assistant text, hides tool rows and call-only assistant rows", () => {
    const found = JSON.stringify({
      total: 2,
      items: [
        { title: "Квартира 1", url: "/catalog/kvartyra-1", price: "1 $" },
        { title: "Квартира 2", url: "/catalog/kvartyra-2", price: "2 $" },
      ],
    });
    const messages = toTranscript([
      { role: "user", content: "Хочу купити", data: null, created_at: at(1) },
      { role: "assistant", content: "", data: { tool_calls: [] }, created_at: at(2) },
      { role: "tool", content: found, data: { tool_call_id: "c1", name: "search_properties" }, created_at: at(3) },
      { role: "assistant", content: "Знайшла два варіанти.", data: null, created_at: at(4) },
      {
        role: "tool",
        content: '{"status":"card_shown"}',
        data: { tool_call_id: "c2", name: "propose_lead" },
        created_at: at(5),
      },
      { role: "assistant", content: "Перевірте картку.", data: null, created_at: at(6) },
    ]);

    expect(messages).toEqual([
      { role: "user", content: "Хочу купити", created_at: at(1) },
      {
        role: "assistant",
        content: "Знайшла два варіанти.",
        created_at: at(4),
        properties: [
          { title: "Квартира 1", url: "/catalog/kvartyra-1" },
          { title: "Квартира 2", url: "/catalog/kvartyra-2" },
        ],
      },
      { role: "assistant", content: "Перевірте картку.", created_at: at(6) },
    ]);
  });

  it("ignores malformed tool results", () => {
    expect(
      toTranscript([
        { role: "tool", content: "not json", data: { tool_call_id: "c", name: "search_properties" }, created_at: at(1) },
        { role: "assistant", content: "Ок", data: null, created_at: at(2) },
      ]),
    ).toEqual([{ role: "assistant", content: "Ок", created_at: at(2) }]);
  });
});
