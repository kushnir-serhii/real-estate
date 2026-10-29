import { describe, expect, it } from "vitest";

import type { LlmEvent, LlmMessage } from "../types";
import { createFixtureLlm } from "./assistant";

const reply = async (...visitor: string[]) => {
  const messages: LlmMessage[] = visitor.map((content) => ({ role: "user", content }));
  const events: LlmEvent[] = [];
  for await (const event of createFixtureLlm({ delayMs: 0 }).stream({ messages })) events.push(event);
  const text = events.flatMap((e) => (e.type === "text" ? [e.delta] : [])).join("");
  return { events, text };
};

describe("fixture assistant", () => {
  it("streams small text deltas, then finish and zero usage", async () => {
    const { events, text } = await reply("Хочу купити квартиру");
    expect(events.filter((e) => e.type === "text").length).toBeGreaterThan(3);
    expect(events.at(-2)).toEqual({ type: "finish", reason: "stop" });
    expect(events.at(-1)).toEqual({ type: "usage", usage: { inputTokens: 0, outputTokens: 0 } });
    expect(text).toContain("кімнат");
  });

  it("asks the next missing question", async () => {
    expect((await reply("Привіт")).text).toContain("купити чи орендувати");
    expect((await reply("Хочу орендувати")).text).toContain("квартиру чи будинок");
    expect((await reply("Хочу купити будинок")).text).toContain("район");
    expect((await reply("Хочу купити квартиру", "2 кімнати")).text).toContain("район");
  });

  it("answers the FAQ", async () => {
    expect((await reply("Яка у вас комісія?")).text).toContain("комісі");
    expect((await reply("Коли ви працюєте?")).text).toContain("щодня");
  });
});
