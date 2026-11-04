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

  describe("lead card", () => {
    it("offers the card for a phone number and passes what it knows", async () => {
      const { call, args, text } = await reply("Хочу купити 2-кімнатну квартиру до 80 000 $", "Мій номер 050 123 45 67");
      expect(text).toBe("");
      expect(call?.name).toBe("propose_lead");
      expect(args).toMatchObject({
        deal: "buy",
        property_type: "flat",
        rooms: ["2"],
        budget: { to: 80000, currency: "USD" },
        phone: "050 123 45 67",
      });
      expect((args as { summary: string }).summary).toContain("купити");
    });

    it("offers the card for request words", async () => {
      expect((await reply("Залиште мою заявку")).call?.name).toBe("propose_lead");
      expect((await reply("Передзвоніть мені")).call?.name).toBe("propose_lead");
      expect((await reply("Зателефонуйте завтра")).call?.name).toBe("propose_lead");
    });

    it("offers the card for «так» only after search results", async () => {
      expect((await reply("Так")).call).toBeUndefined();
      const found = JSON.stringify({ total: 1, shown: 1, items: [{ title: "Квартира", price: "1 $" }] });
      const afterResults = await run([
        { role: "user", content: "Хочу купити квартиру" },
        { role: "tool", toolCallId: "x", content: found },
        { role: "assistant", content: "Є варіанти." },
        { role: "user", content: "Так" },
      ]);
      expect(afterResults.call?.name).toBe("propose_lead");
    });

    it("says to check the card, not that the request is sent", async () => {
      const done = await run([
        { role: "user", content: "Залиште заявку" },
        { role: "tool", toolCallId: "x", content: JSON.stringify({ status: "card_shown" }) },
      ]);
      expect(done.call).toBeUndefined();
      expect(done.text).toBe("Перевірте дані в картці й натисніть «Надіслати».");
    });
  });
});
