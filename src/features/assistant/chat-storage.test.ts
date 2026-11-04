import { describe, expect, it } from "vitest";

import { buildAssistantRequest } from "./assistant-chat-store";
import { INITIAL_CHAT_STATE, INTERRUPTED_MESSAGE } from "./chat-reducer";
import { MAX_STORED_MESSAGES, parseStoredChat } from "./chat-storage";
import { propertySlugFromPath } from "./property-path";

const CONVERSATION = "7d6a1f0e-3c1b-4a53-9d2f-0a1b2c3d4e5f";
const MESSAGE_ID = "5b1f9c2e-8a3d-4e6f-9b0a-1c2d3e4f5a6b";

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

const storedCard = (submit: unknown) =>
  JSON.stringify({
    conversationId: CONVERSATION,
    messages: [
      {
        id: "r1",
        role: "assistant",
        parts: [
          {
            kind: "lead_card",
            proposalId: "p1",
            prefill: { phone: "+380671234567" },
            summary: "Квартира",
            clientRequestId: "req-1",
            submit,
          },
        ],
        prompt: "Так",
        state: { status: "done" },
      },
    ],
  });

const restoredCard = (raw: string) => {
  const message = parseStoredChat(raw).messages[0];
  if (message?.role !== "assistant") throw new Error("no reply");
  return message.parts[0];
};

describe("parseStoredChat: lead card", () => {
  it("restores a card with its request id and result", () => {
    expect(restoredCard(storedCard({ status: "invalid", fieldErrors: { phone: "Перевірте номер" } }))).toEqual({
      kind: "lead_card",
      proposalId: "p1",
      prefill: { phone: "+380671234567" },
      summary: "Квартира",
      clientRequestId: "req-1",
      submit: { status: "invalid", fieldErrors: { phone: "Перевірте номер" } },
    });
  });

  it("gives a card that was sending its button back (the same request id makes a resend safe)", () => {
    expect(restoredCard(storedCard({ status: "pending" }))).toMatchObject({
      clientRequestId: "req-1",
      submit: { status: "idle" },
    });
  });

  it("keeps the chat when a card's result is unreadable", () => {
    expect(restoredCard(storedCard({ status: "weird" }))).toMatchObject({ submit: { status: "idle" } });
  });
});

describe("buildAssistantRequest", () => {
  it("sends the conversation id, page and property slug, never the history", () => {
    const request = buildAssistantRequest(
      { conversationId: CONVERSATION, messages: [{ id: "u1", role: "user", text: "old" }] },
      { text: "Привіт", clientMessageId: MESSAGE_ID },
      "https://example.com/catalog/flat",
      "/catalog/flat",
    );
    expect(request).toEqual({
      conversation_id: CONVERSATION,
      message: "Привіт",
      client_message_id: MESSAGE_ID,
      turnstile_token: undefined,
      page_url: "https://example.com/catalog/flat",
      property_slug: "flat",
    });
  });

  it("leaves the conversation id out of a new chat", () => {
    expect(buildAssistantRequest(INITIAL_CHAT_STATE, { text: "Hi", clientMessageId: MESSAGE_ID }, "https://example.com/", "/")
        .conversation_id).toBeUndefined();
  });
});

describe("parseStoredChat: slice 4", () => {
  const storedReply = (extra: Record<string, unknown>) =>
    JSON.stringify({
      conversationId: null,
      messages: [
        { id: "u1", role: "user", text: "Купити" },
        {
          id: "r1",
          role: "assistant",
          parts: [],
          prompt: "Купити",
          state: { status: "error", message: "Збій" },
          ...extra,
        },
      ],
    });

  const restoredReply = (raw: string) => {
    const message = parseStoredChat(raw).messages[1];
    if (message?.role !== "assistant") throw new Error("no reply");
    return message;
  };

  it("keeps the message id, so a retry after a reload reuses it", () => {
    expect(restoredReply(storedReply({ clientMessageId: MESSAGE_ID })).clientMessageId).toBe(MESSAGE_ID);
  });

  it("loads a chat stored without message ids, and drops an unreadable id instead of the chat", () => {
    expect(restoredReply(storedReply({})).clientMessageId).toBeUndefined();
    const broken = restoredReply(storedReply({ clientMessageId: "not-a-uuid" }));
    expect(broken.clientMessageId).toBeUndefined();
    expect(broken.prompt).toBe("Купити");
  });

  it("turns a reply that was waiting for the check into a retryable error", () => {
    expect(restoredReply(storedReply({ state: { status: "verifying" } })).state).toEqual({
      status: "error",
      message: INTERRUPTED_MESSAGE,
    });
  });

  it("keeps every limit reason", () => {
    for (const reason of ["rate_limit", "conversation_limit", "message_too_long", "budget", "turnstile"]) {
      expect(restoredReply(storedReply({ state: { status: "limit", reason } })).state).toEqual({
        status: "limit",
        reason,
      });
    }
  });
});

describe("buildAssistantRequest: slice 4", () => {
  it("sends the message id and the Turnstile token when there is one", () => {
    const request = buildAssistantRequest(
      INITIAL_CHAT_STATE,
      { text: "Hi", clientMessageId: MESSAGE_ID, turnstileToken: "token" },
      "https://example.com/",
      "/",
    );
    expect(request).toMatchObject({ client_message_id: MESSAGE_ID, turnstile_token: "token" });
  });
});
