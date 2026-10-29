import { describe, expect, it } from "vitest";

import type { LlmEvent, LlmMessage } from "../types";
import { createFixtureLlm } from "./assistant";

const run = async (messages: LlmMessage[]) => {
  const events: LlmEvent[] = [];
  for await (const event of createFixtureLlm({ delayMs: 0 }).stream({ messages })) events.push(event);
  const text = events.flatMap((e) => (e.type === "text" ? [e.delta] : [])).join("");
  const call = events.find((e) => e.type === "tool_call")?.call;
  const args: unknown = call ? JSON.parse(call.arguments) : null;
  return { events, text, args, call };
};

const reply = (...visitor: string[]) => run(visitor.map((content) => ({ role: "user", content })));

describe("fixture assistant", () => {
  it("streams small text deltas, then finish and zero usage", async () => {
    const { events, text } = await reply("Привіт");
    expect(events.filter((e) => e.type === "text").length).toBeGreaterThan(3);
    expect(events.at(-2)).toEqual({ type: "finish", reason: "stop" });
    expect(events.at(-1)).toEqual({ type: "usage", usage: { inputTokens: 0, outputTokens: 0 } });
    expect(text).toContain("купити чи орендувати");
  });

  it("answers the FAQ", async () => {
    expect((await reply("Яка у вас комісія?")).text).toContain("комісі");
    expect((await reply("Коли ви працюєте?")).text).toContain("щодня");
  });

  it("calls search_properties once it knows the deal or type", async () => {
    const buy = await reply("Хочу купити квартиру");
    expect(buy.text).toBe("");
    expect(buy.call?.name).toBe("search_properties");
    expect(buy.events.at(-2)).toEqual({ type: "finish", reason: "tool_calls" });
    expect(buy.args).toEqual({ deal: "buy", property_type: "flat" });

    expect((await reply("Хочу орендувати")).args).toEqual({ deal: "rent" });
    expect((await reply("Шукаю будинок")).args).toEqual({ property_type: "house" });
  });

  it("passes rooms and a budget with its currency", async () => {
    expect((await reply("Хочу купити 2-кімнатну квартиру до 80 000 $")).args).toEqual({
      deal: "buy",
      property_type: "flat",
      rooms: ["2"],
      budget_to: 80000,
      currency: "USD",
    });
    expect((await reply("Орендувати квартиру до 3 млн грн")).args).toMatchObject({
      budget_to: 3_000_000,
      currency: "UAH",
    });
    expect((await reply("Купити квартиру від 50 тис до 1500 євро")).args).toMatchObject({
      budget_from: 50_000,
      budget_to: 1500,
      currency: "EUR",
    });
  });

  it("does not take a bare number for a budget (it is the room count here)", async () => {
    expect((await reply("Хочу купити квартиру до 2 кімнат")).args).toEqual({ deal: "buy", property_type: "flat", rooms: ["2"] });
  });

  it("uses the same call id pattern per round and never calls a tool right after a result", async () => {
    const first = await reply("Хочу купити квартиру");
    expect(first.call?.id).toBe("fixture-call-1");
    const found = JSON.stringify({ total: 3, shown: 1, items: [{ title: "Квартира на Печерську", price: "85 000 $" }] });
    const after = await run([
      { role: "user", content: "Хочу купити квартиру" },
      { role: "assistant", content: "", toolCalls: [{ id: "fixture-call-1", name: "search_properties", arguments: "{}" }] },
      { role: "tool", toolCallId: "fixture-call-1", content: found },
    ]);
    expect(after.call).toBeUndefined();
    expect(after.text).toContain("усього 3");
    expect(after.text).toContain("Квартира на Печерську");
  });

  it("says nothing was found and offers a request on an empty result", async () => {
    const empty = await run([
      { role: "user", content: "Хочу купити квартиру" },
      { role: "tool", toolCallId: "x", content: JSON.stringify({ total: 0, shown: 0, items: [] }) },
    ]);
    expect(empty.text).toContain("немає");
    expect(empty.text).toContain("запит");
  });
});
