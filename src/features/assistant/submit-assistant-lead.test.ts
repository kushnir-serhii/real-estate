import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getConversation: vi.fn(),
  isPropertyPublished: vi.fn(),
  setConversationLead: vi.fn(),
  createLead: vi.fn(),
  deliverLead: vi.fn(),
  after: vi.fn(),
}));

vi.mock("@/lib/db/assistant", () => ({
  getConversation: mocks.getConversation,
  isPropertyPublished: mocks.isPropertyPublished,
  setConversationLead: mocks.setConversationLead,
  setConversationProposal: vi.fn(),
}));
vi.mock("@/lib/db/leads", () => ({ createLead: mocks.createLead }));
vi.mock("@/features/leads/deliver-lead", () => ({ deliverLead: mocks.deliverLead }));
vi.mock("next/server", () => ({ after: mocks.after }));

import { processAssistantLead } from "./submit-assistant-lead";

const CONVERSATION_ID = "7d6a1f0e-3c1b-4a53-9d2f-0a1b2c3d4e5f";
const PROPOSAL_ID = "0b0e1d2a-6f3c-4c7e-9a41-2f7d8c9b1a10";
const REQUEST_ID = "5e3f1c2b-8a9d-4b6e-a1c0-3d4e5f6a7b8c";
const PROPERTY_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

const proposal = {
  proposal_id: PROPOSAL_ID,
  summary: "Хоче купити квартиру",
  wishes: { deal: "buy", property_type: "flat", rooms: ["2"], budget: { to: 80000, currency: "USD" }, payment: "cash" },
  created_at: "2026-10-29T10:00:00.000Z",
};

const conversation = (over: Record<string, unknown> = {}) => ({
  id: CONVERSATION_ID,
  page_url: "/catalog/x",
  property_id: null,
  proposal,
  turnstile_ok: true,
  ...over,
});

const input = (over: Record<string, unknown> = {}) => ({
  conversation_id: CONVERSATION_ID,
  proposal_id: PROPOSAL_ID,
  client_request_id: REQUEST_ID,
  name: "Іван",
  phone: "050 123 45 67",
  email: "",
  consent: true,
  honeypot: "",
  ...over,
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getConversation.mockResolvedValue(conversation());
  mocks.isPropertyPublished.mockResolvedValue(true);
  mocks.setConversationLead.mockResolvedValue(undefined);
  mocks.createLead.mockResolvedValue({ id: "lead-1", created: true });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("processAssistantLead", () => {
  it("creates an ai lead from the stored proposal, links the conversation and delivers after the response", async () => {
    const result = await processAssistantLead(input());

    expect(result).toEqual({ status: "ok" });
    expect(mocks.createLead).toHaveBeenCalledTimes(1);
    expect(mocks.createLead).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "ai",
        client_request_id: REQUEST_ID,
        name: "Іван",
        phone: "+380501234567",
        page_url: "/catalog/x",
        property_id: undefined,
        payload: { ...proposal.wishes, summary: proposal.summary, conversation_id: CONVERSATION_ID },
      }),
    );
    expect(mocks.setConversationLead).toHaveBeenCalledWith(CONVERSATION_ID, "lead-1");
    expect(mocks.after).toHaveBeenCalledTimes(1);
    const task = mocks.after.mock.calls[0]?.[0] as () => Promise<void>;
    await task();
    expect(mocks.deliverLead).toHaveBeenCalledWith("lead-1");
  });

  it("takes the wishes from the server, never from extra fields the client sends", async () => {
    await processAssistantLead(
      input({ payload: { deal: "rent" }, wishes: { deal: "rent" }, summary: "hacked", budget: { to: 1 } }),
    );
    const saved = mocks.createLead.mock.calls[0]?.[0] as { payload: Record<string, unknown> };
    expect(saved.payload).toEqual({ ...proposal.wishes, summary: proposal.summary, conversation_id: CONVERSATION_ID });
  });

  it("keeps the property only while it is published", async () => {
    mocks.getConversation.mockResolvedValue(conversation({ property_id: PROPERTY_ID }));
    await processAssistantLead(input());
    expect(mocks.createLead).toHaveBeenLastCalledWith(expect.objectContaining({ property_id: PROPERTY_ID }));

    mocks.isPropertyPublished.mockResolvedValue(false);
    await processAssistantLead(input());
    expect(mocks.createLead).toHaveBeenLastCalledWith(expect.objectContaining({ property_id: undefined }));
  });

  it("saves nothing without consent, a name or a valid phone", async () => {
    const noConsent = await processAssistantLead(input({ consent: false }));
    expect(noConsent).toEqual({ status: "invalid", fieldErrors: { consent: "Потрібна ваша згода" } });
    const noName = await processAssistantLead(input({ name: " " }));
    expect(noName).toMatchObject({ status: "invalid", fieldErrors: { name: "Вкажіть ім'я" } });
    const badPhone = await processAssistantLead(input({ phone: "123" }));
    expect(badPhone).toMatchObject({ status: "invalid", fieldErrors: { phone: "Перевірте номер телефону" } });
    expect(mocks.createLead).not.toHaveBeenCalled();
  });

  it("silently succeeds on a filled honeypot without touching anything", async () => {
    expect(await processAssistantLead(input({ honeypot: "http://spam" }))).toEqual({ status: "ok" });
    expect(mocks.getConversation).not.toHaveBeenCalled();
    expect(mocks.createLead).not.toHaveBeenCalled();
  });

  it("refuses a stale card: unknown conversation, no Turnstile check, no proposal, or another proposal id", async () => {
    const message = "Картка застаріла, попросіть асистента ще раз";
    mocks.getConversation.mockResolvedValue(null);
    expect(await processAssistantLead(input())).toEqual({ status: "error", message });
    mocks.getConversation.mockResolvedValue(conversation({ proposal: null }));
    expect(await processAssistantLead(input())).toEqual({ status: "error", message });
    mocks.getConversation.mockResolvedValue(conversation({ turnstile_ok: false }));
    expect(await processAssistantLead(input())).toEqual({ status: "error", message });
    mocks.getConversation.mockResolvedValue(conversation());
    expect(await processAssistantLead(input({ proposal_id: "11111111-1111-4111-8111-111111111111" }))).toEqual({
      status: "error",
      message,
    });
    expect((await processAssistantLead({ nothing: true })).status).not.toBe("ok");
    expect(mocks.createLead).not.toHaveBeenCalled();
  });

  it("double submit: the same client_request_id gives one lead and one delivery", async () => {
    mocks.createLead.mockResolvedValueOnce({ id: "lead-1", created: true });
    mocks.createLead.mockResolvedValueOnce({ id: "lead-1", created: false });
    expect(await processAssistantLead(input())).toEqual({ status: "ok" });
    expect(await processAssistantLead(input())).toEqual({ status: "ok" });
    expect(mocks.createLead.mock.calls.map((c) => (c[0] as { client_request_id: string }).client_request_id)).toEqual([
      REQUEST_ID,
      REQUEST_ID,
    ]);
    expect(mocks.after).toHaveBeenCalledTimes(1);
  });

  it("answers with a save error when the lead could not be saved, without leaking details", async () => {
    mocks.createLead.mockRejectedValue(new Error("insert failed for +380501234567"));
    const result = await processAssistantLead(input());
    expect(result).toEqual({ status: "error", message: "Не вдалося надіслати заявку. Спробуйте ще раз." });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("380");
    expect(mocks.after).not.toHaveBeenCalled();
  });

  it("still succeeds when only the conversation link fails", async () => {
    mocks.setConversationLead.mockRejectedValue(new Error("x"));
    expect(await processAssistantLead(input())).toEqual({ status: "ok" });
    expect(mocks.after).toHaveBeenCalledTimes(1);
  });
});
