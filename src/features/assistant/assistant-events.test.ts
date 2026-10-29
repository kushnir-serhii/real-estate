import { describe, expect, it } from "vitest";

import {
  assistantEventSchema,
  assistantRequestSchema,
  encodeAssistantEvent,
  parseAssistantEventLine,
} from "./assistant-events";
import type { AssistantEvent } from "./assistant-events";

const ID = "7d6a1f0e-3c1b-4a53-9d2f-0a1b2c3d4e5f";

describe("assistantEventSchema", () => {
  const valid: AssistantEvent[] = [
    { type: "conversation", id: ID },
    { type: "text", delta: "Привіт" },
    {
      type: "properties",
      items: [
        {
          slug: "kvartyra-1",
          title: "Квартира",
          price: "85 000 $",
          rooms: 2,
          area_total: 54.5,
          district: "Печерський",
          photo_url: null,
          url: "/catalog/kvartyra-1",
        },
      ],
      total: 7,
      catalog_url: "/catalog?deal=sell",
    },
    { type: "lead_card", proposal_id: ID, prefill: { name: "Олена" }, summary: "Купівля квартири" },
    { type: "limit", reason: "rate_limit" },
    { type: "error", message: "Помилка" },
    { type: "done" },
  ];

  it.each(valid)("accepts a $type event", (event) => {
    expect(assistantEventSchema.parse(event)).toEqual(event);
  });

  it("rejects unknown types, bad ids and unknown limit reasons", () => {
    expect(assistantEventSchema.safeParse({ type: "nope" }).success).toBe(false);
    expect(assistantEventSchema.safeParse({ type: "conversation", id: "x" }).success).toBe(false);
    expect(assistantEventSchema.safeParse({ type: "limit", reason: "other" }).success).toBe(false);
    expect(assistantEventSchema.safeParse({ type: "text" }).success).toBe(false);
  });
});

describe("NDJSON helpers", () => {
  it("round-trips an event through one line", () => {
    const line = encodeAssistantEvent({ type: "text", delta: "a\nb" });
    expect(line.endsWith("\n")).toBe(true);
    expect(line.slice(0, -1)).not.toContain("\n");
    expect(parseAssistantEventLine(line.trim())).toEqual({ type: "text", delta: "a\nb" });
  });

  it("returns null for blank, broken or unknown lines", () => {
    expect(parseAssistantEventLine("")).toBeNull();
    expect(parseAssistantEventLine("{broken")).toBeNull();
    expect(parseAssistantEventLine('{"type":"nope"}')).toBeNull();
  });
});

describe("assistantRequestSchema", () => {
  it("accepts a minimal body and trims the message", () => {
    expect(assistantRequestSchema.parse({ message: "  Привіт  " })).toEqual({ message: "Привіт" });
  });

  it("accepts all fields", () => {
    const body = { conversation_id: ID, message: "Hi", page_url: "/catalog/x", property_slug: "x" };
    expect(assistantRequestSchema.parse(body)).toEqual(body);
  });

  it("rejects empty, whitespace-only and too long messages and a non-uuid conversation id", () => {
    expect(assistantRequestSchema.safeParse({ message: "" }).success).toBe(false);
    expect(assistantRequestSchema.safeParse({ message: "   " }).success).toBe(false);
    expect(assistantRequestSchema.safeParse({ message: "a".repeat(1001) }).success).toBe(false);
    expect(assistantRequestSchema.safeParse({ message: "a".repeat(1000) }).success).toBe(true);
    expect(assistantRequestSchema.safeParse({ message: "Hi", conversation_id: "nope" }).success).toBe(false);
    expect(assistantRequestSchema.safeParse({}).success).toBe(false);
  });
});
