import { describe, expect, it } from "vitest";

import { buildAssistantRequest } from "./assistant-chat-store";
import { INITIAL_CHAT_STATE, INTERRUPTED_MESSAGE } from "./chat-reducer";
import { MAX_STORED_MESSAGES, parseStoredChat } from "./chat-storage";
import { propertySlugFromPath } from "./property-path";

const CONVERSATION = "7d6a1f0e-3c1b-4a53-9d2f-0a1b2c3d4e5f";

describe("parseStoredChat", () => {
  it("restores a valid chat", () => {
    const stored = {
      conversationId: CONVERSATION,
      messages: [
        { id: "u1", role: "user", text: "Купити" },
        {
          id: "r1",
          role: "assistant",
          parts: [
            {
              kind: "properties",
              items: [
                {
                  slug: "kvartyra-1",
                  title: "Квартира",
                  price: "85 000 $",
                  rooms: 2,
                  area_total: 54,
                  district: null,
                  photo_url: null,
                  url: "/catalog/kvartyra-1",
                },
              ],
              total: 7,
              catalogUrl: "/catalog?deal=sell",
            },
            { kind: "text", text: "Який район?" },
          ],
          prompt: "Купити",
          state: { status: "done" },
        },
      ],
    };
    expect(parseStoredChat(JSON.stringify(stored))).toEqual(stored);
  });

  it("loads a reply stored before replies had parts as one text part", () => {
    const legacy = {
      conversationId: null,
      messages: [
        { id: "r1", role: "assistant", text: "Який район?", prompt: "Купити", state: { status: "done" } },
        { id: "r2", role: "assistant", text: "", prompt: "Ще", state: { status: "error", message: "Збій" } },
      ],
    };
    expect(parseStoredChat(JSON.stringify(legacy)).messages).toEqual([
      { id: "r1", role: "assistant", parts: [{ kind: "text", text: "Який район?" }], prompt: "Купити", state: { status: "done" } },
      { id: "r2", role: "assistant", parts: [], prompt: "Ще", state: { status: "error", message: "Збій" } },
    ]);
  });

  it("drops a chat with a malformed property card", () => {
    const stored = {
      conversationId: null,
      messages: [
        {
          id: "r1",
          role: "assistant",
          parts: [{ kind: "properties", items: [{ slug: "x" }], total: 1, catalogUrl: "/catalog" }],
          prompt: "Купити",
          state: { status: "done" },
        },
      ],
    };
    expect(parseStoredChat(JSON.stringify(stored))).toBe(INITIAL_CHAT_STATE);
  });

  it("drops missing, malformed and foreign data", () => {
    expect(parseStoredChat(null)).toBe(INITIAL_CHAT_STATE);
    expect(parseStoredChat("{")).toBe(INITIAL_CHAT_STATE);
    expect(parseStoredChat(JSON.stringify({ conversationId: "nope", messages: [] }))).toBe(INITIAL_CHAT_STATE);
    expect(parseStoredChat(JSON.stringify({ conversationId: null, messages: [{ role: "system" }] }))).toBe(
      INITIAL_CHAT_STATE,
    );
  });

  it("turns a reply cut off by a reload into a retryable error", () => {
    const stored = {
      conversationId: null,
      messages: [
        { id: "r1", role: "assistant", parts: [{ kind: "text", text: "Част" }], prompt: "Купити", state: { status: "streaming" } },
      ],
    };
    expect(parseStoredChat(JSON.stringify(stored)).messages[0]).toMatchObject({
      state: { status: "error", message: INTERRUPTED_MESSAGE },
    });
  });

  it("keeps only the latest messages", () => {
    const messages = Array.from({ length: MAX_STORED_MESSAGES + 5 }, (_, index) => ({
      id: `u${index}`,
      role: "user",
      text: String(index),
    }));
    const restored = parseStoredChat(JSON.stringify({ conversationId: null, messages }));
    expect(restored.messages).toHaveLength(MAX_STORED_MESSAGES);
    expect(restored.messages[0]).toMatchObject({ id: "u5" });
  });
});

describe("propertySlugFromPath", () => {
  it("finds the slug only on a property page", () => {
    expect(propertySlugFromPath("/catalog/kvartyra-1")).toBe("kvartyra-1");
    expect(propertySlugFromPath("/catalog/kvartyra-1/")).toBe("kvartyra-1");
    expect(propertySlugFromPath("/catalog")).toBeUndefined();
    expect(propertySlugFromPath("/catalog/a/b")).toBeUndefined();
    expect(propertySlugFromPath("/catalog/%E0%A4%A")).toBeUndefined();
  });
});

describe("buildAssistantRequest", () => {
  it("sends the conversation id, page and property slug, never the history", () => {
    const request = buildAssistantRequest(
      { conversationId: CONVERSATION, messages: [{ id: "u1", role: "user", text: "old" }] },
      "Привіт",
      "https://example.com/catalog/flat",
      "/catalog/flat",
    );
    expect(request).toEqual({
      conversation_id: CONVERSATION,
      message: "Привіт",
      page_url: "https://example.com/catalog/flat",
      property_slug: "flat",
    });
  });

  it("leaves the conversation id out of a new chat", () => {
    expect(buildAssistantRequest(INITIAL_CHAT_STATE, "Hi", "https://example.com/", "/").conversation_id).toBeUndefined();
  });
});
