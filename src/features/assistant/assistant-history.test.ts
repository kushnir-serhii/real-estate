import { describe, expect, it } from "vitest";

import { assistantToolCallsData, toLlmHistory, toolResultData } from "./assistant-history";
import type { HistoryRow } from "./assistant-history";

const call = { id: "call_1", name: "search_properties", arguments: '{"deal":"buy"}' };
const call2 = { id: "call_2", name: "search_properties", arguments: "{}" };

const toolRound = (calls = [call]): HistoryRow[] => [
  { role: "assistant", content: "", data: assistantToolCallsData(calls) },
  ...calls.map((c) => ({ role: "tool", content: `{"total":1,"for":"${c.id}"}`, data: toolResultData(c) })),
];

describe("toLlmHistory", () => {
  it("keeps plain user and assistant turns and skips empty assistant rows", () => {
    expect(
      toLlmHistory([
        { role: "user", content: "Привіт" },
        { role: "assistant", content: "" },
        { role: "assistant", content: "Вітаю" },
      ]),
    ).toEqual([
      { role: "user", content: "Привіт" },
      { role: "assistant", content: "Вітаю" },
    ]);
  });

  it("rebuilds an assistant tool call followed by its tool messages", () => {
    const history = toLlmHistory([
      { role: "user", content: "Купити" },
      ...toolRound([call, call2]),
      { role: "assistant", content: "Ось варіанти" },
    ]);
    expect(history).toEqual([
      { role: "user", content: "Купити" },
      { role: "assistant", content: "", toolCalls: [call, call2] },
      { role: "tool", toolCallId: "call_1", content: '{"total":1,"for":"call_1"}' },
      { role: "tool", toolCallId: "call_2", content: '{"total":1,"for":"call_2"}' },
      { role: "assistant", content: "Ось варіанти" },
    ]);
  });

  it("drops tool rows whose call was cut off by the history limit", () => {
    const [, result] = toolRound();
    expect(result).toBeDefined();
    const history = toLlmHistory([
      ...(result ? [result] : []),
      { role: "assistant", content: "Ось" },
      { role: "user", content: "Ще" },
    ]);
    expect(history).toEqual([
      { role: "assistant", content: "Ось" },
      { role: "user", content: "Ще" },
    ]);
  });

  it("drops tool calls that lack a result, keeping the assistant's text", () => {
    const calls = [call, call2];
    const rows = toolRound(calls).slice(0, 2); // only the first call is answered
    expect(toLlmHistory([{ role: "user", content: "a" }, ...rows])).toEqual([{ role: "user", content: "a" }]);
    const withText: HistoryRow[] = [
      { role: "assistant", content: "Шукаю", data: assistantToolCallsData(calls) },
      ...rows.slice(1),
    ];
    expect(toLlmHistory(withText)).toEqual([{ role: "assistant", content: "Шукаю" }]);
  });

  it("ignores tool rows with unreadable data", () => {
    const history = toLlmHistory([
      { role: "assistant", content: "", data: assistantToolCallsData([call]) },
      { role: "tool", content: "x", data: { nope: true } },
      { role: "user", content: "ok" },
    ]);
    expect(history).toEqual([{ role: "user", content: "ok" }]);
  });
});
