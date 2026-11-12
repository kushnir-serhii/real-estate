import { beforeAll, describe, expect, it } from "vitest";
import { demoAssistantDriver } from "@/lib/demo/db/assistant";
import { demoLeadsDriver } from "@/lib/demo/db/leads";
import { buildDemoSeed } from "@/lib/demo/seed";
import { getDemoStore, resetDemoStore } from "@/lib/demo/store";
import type { AssistantDriver, LeadsDriver } from "./driver-types";
import { createLeadSchema } from "./leads";
import type { CreateLeadInput } from "./leads";

/**
 * Contract tests for the write side (leads, delivery retry, assistant storage): the same cases run against the
 * demo driver (always) and the Supabase driver (only when a local database with the service role key is
 * reachable; skipped otherwise). Cases assert on the rows they create, never on the whole table.
 */

type Drivers = { leads: LeadsDriver; assistant: AssistantDriver };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const BIG = 10_000;

const newLead = async (d: Drivers, overrides: Partial<CreateLeadInput> = {}) => {
  const input: CreateLeadInput = {
    kind: "general",
    name: "Тест Тестович",
    phone: "+380 00 000 00 09",
    consent_at: new Date().toISOString(),
    client_request_id: crypto.randomUUID(),
    payload: { deal: "sell" },
    ...overrides,
  };
  return { input, ...(await d.leads.insertLead(createLeadSchema.parse(input))) };
};

const due = (d: Drivers, now = new Date(), staleBefore = new Date(now.getTime() - 10 * MINUTE)) =>
  d.leads.fetchDueLeadIds({ now, staleBefore, maxAttempts: 5, limit: BIG });

const failedPlektan = (attempts: number, nextAttemptAt: string | null) =>
  ({ channel: "plektan", status: "failed", error: "boom", attempts, nextAttemptAt }) as const;

const runWriteContract = (name: string, getDrivers: () => Drivers | Promise<Drivers>, skip: boolean) => {
  describe.skipIf(skip)(`write data driver contract: ${name}`, () => {
    let d: Drivers;
    beforeAll(async () => {
      d = await getDrivers();
    });

    describe("leads", () => {
      it("saves a lead with the column defaults", async () => {
        const { id, created } = await newLead(d);
        expect(created).toBe(true);
        const stored = await d.leads.fetchLeadForDelivery(id);
        expect(stored).toMatchObject({
          id,
          kind: "general",
          email: null,
          message: null,
          plektan_status: "pending",
          plektan_attempts: 0,
          telegram_status: "pending",
          telegram_attempts: 0,
          property: null,
        });
        expect(stored?.payload).toEqual({ deal: "sell" });
      });

      it("dedupes on client_request_id: a double submit is one lead", async () => {
        const first = await newLead(d);
        const again = await d.leads.insertLead(createLeadSchema.parse({ ...first.input, name: "Інше ім'я" }));
        expect(again).toEqual({ id: first.id, created: false });
        expect((await d.leads.fetchLeadForDelivery(first.id))?.name).toBe("Тест Тестович");
        const other = await newLead(d);
        expect(other.id).not.toBe(first.id);
      });

      it("returns null for an unknown lead and ignores a delivery update for it", async () => {
        const id = crypto.randomUUID();
        expect(await d.leads.fetchLeadForDelivery(id)).toBeNull();
        await expect(d.leads.updateLeadDelivery(id, failedPlektan(1, null))).resolves.toBeUndefined();
      });

      it("records each channel's delivery result; itemId is only written when given", async () => {
        const { id } = await newLead(d);
        await d.leads.updateLeadDelivery(id, {
          channel: "plektan",
          status: "sent",
          error: null,
          attempts: 1,
          itemId: "advert-1",
          nextAttemptAt: null,
        });
        await d.leads.updateLeadDelivery(id, { channel: "telegram", status: "skipped", error: null, attempts: 0, nextAttemptAt: null });
        await d.leads.updateLeadDelivery(id, { channel: "plektan", status: "sent", error: null, attempts: 2, nextAttemptAt: null });
        const stored = await d.leads.fetchLeadForDelivery(id);
        expect(stored).toMatchObject({ plektan_status: "sent", plektan_attempts: 2, telegram_status: "skipped" });
      });

      it("rejects a property_id that does not exist", async () => {
        await expect(newLead(d, { property_id: crypto.randomUUID() })).rejects.toThrow();
      });
    });

    describe("retry selection", () => {
      it("picks failed deliveries that are due and have attempts left", async () => {
        const now = new Date();
        const dueNow = (await newLead(d)).id;
        await d.leads.updateLeadDelivery(dueNow, failedPlektan(1, new Date(now.getTime() - MINUTE).toISOString()));
        const later = (await newLead(d)).id;
        await d.leads.updateLeadDelivery(later, failedPlektan(1, new Date(now.getTime() + HOUR).toISOString()));
        const exhausted = (await newLead(d)).id;
        await d.leads.updateLeadDelivery(exhausted, failedPlektan(5, new Date(now.getTime() - MINUTE).toISOString()));
        const noTime = (await newLead(d)).id;
        await d.leads.updateLeadDelivery(noTime, failedPlektan(2, null));
        const telegram = (await newLead(d)).id;
        await d.leads.updateLeadDelivery(telegram, {
          channel: "telegram",
          status: "failed",
          error: "boom",
          attempts: 2,
          nextAttemptAt: new Date(now.getTime() - MINUTE).toISOString(),
        });

        const ids = await due(d, now);
        expect(ids).toContain(dueNow);
        expect(ids).toContain(telegram);
        expect(ids).not.toContain(later);
        expect(ids).not.toContain(exhausted);
        expect(ids).not.toContain(noTime);
      });

      it("leaves a fresh pending lead to the in-flight delivery, picks a stale one", async () => {
        const { id } = await newLead(d);
        const now = new Date();
        expect(await due(d, now, new Date(now.getTime() - 10 * MINUTE))).not.toContain(id);
        expect(await due(d, now, new Date(now.getTime() + MINUTE))).toContain(id);
      });

      it("does not pick sent or skipped leads", async () => {
        const { id } = await newLead(d);
        await d.leads.updateLeadDelivery(id, { channel: "plektan", status: "sent", error: null, attempts: 1, nextAttemptAt: null });
        await d.leads.updateLeadDelivery(id, { channel: "telegram", status: "skipped", error: null, attempts: 0, nextAttemptAt: null });
        expect(await due(d, new Date(), new Date(Date.now() + DAY))).not.toContain(id);
      });

      it("requeues recent skipped channels only: old, sent and the other channel stay", async () => {
        const skip = (id: string, channel: "plektan" | "telegram") =>
          d.leads.updateLeadDelivery(id, { channel, status: "skipped", error: null, attempts: 0, nextAttemptAt: null });
        const recent = (await newLead(d)).id;
        await skip(recent, "telegram");
        const sent = (await newLead(d)).id;
        await d.leads.updateLeadDelivery(sent, { channel: "telegram", status: "sent", error: null, attempts: 1, nextAttemptAt: null });
        const other = (await newLead(d)).id;
        await skip(other, "plektan");

        const changed = await d.leads.requeueSkippedLeads({ channel: "telegram", createdAfter: new Date(Date.now() - 7 * DAY) });
        expect(changed).toBeGreaterThanOrEqual(1);
        expect(await d.leads.fetchLeadForDelivery(recent)).toMatchObject({ telegram_status: "pending", telegram_attempts: 0 });
        expect(await d.leads.fetchLeadForDelivery(sent)).toMatchObject({ telegram_status: "sent", telegram_attempts: 1 });
        expect(await d.leads.fetchLeadForDelivery(other)).toMatchObject({ plektan_status: "skipped", telegram_status: "pending" });

        // A cut-off after every lead's creation leaves skipped channels as they are.
        await skip(recent, "telegram");
        await d.leads.requeueSkippedLeads({ channel: "telegram", createdAfter: new Date(Date.now() + DAY) });
        expect(await d.leads.fetchLeadForDelivery(recent)).toMatchObject({ telegram_status: "skipped" });
      });

      it("lists leads whose Plektan delivery ran out of attempts once, until alerted", async () => {
        const { id } = await newLead(d);
        await d.leads.updateLeadDelivery(id, failedPlektan(5, null));
        const before = await d.leads.fetchLeadsToAlert({ maxAttempts: 5, limit: BIG });
        expect(before.map((lead) => lead.id)).toContain(id);
        await d.leads.markPlektanAlerted(id, new Date());
        const after = await d.leads.fetchLeadsToAlert({ maxAttempts: 5, limit: BIG });
        expect(after.map((lead) => lead.id)).not.toContain(id);
      });
    });

    describe("assistant storage", () => {
      it("creates a conversation with defaults and appends messages in order", async () => {
        const conversation = await d.assistant.createConversation({ pageUrl: "/", ipHash: "hash-a" });
        expect(conversation).toMatchObject({ message_count: 0, turnstile_ok: false, lead_id: null, proposal: null, cost_usd: 0 });

        await d.assistant.appendMessages(conversation.id, [
          { role: "user", content: "Привіт", client_message_id: crypto.randomUUID() },
          { role: "assistant", content: "Добрий день" },
        ]);
        await d.assistant.appendMessages(conversation.id, [{ role: "user", content: "Шукаю квартиру", data: { a: 1 } }]);

        const messages = await d.assistant.fetchConversationMessages(conversation.id, 200);
        expect(messages.map((m) => m.content)).toEqual(["Привіт", "Добрий день", "Шукаю квартиру"]);
        expect(messages[2].data).toEqual({ a: 1 });
        expect((await d.assistant.fetchConversationMessages(conversation.id, 2)).map((m) => m.content)).toEqual([
          "Добрий день",
          "Шукаю квартиру",
        ]);
        expect((await d.assistant.fetchConversation(conversation.id))?.message_count).toBe(3);
        expect(await d.assistant.countUserMessages(conversation.id)).toBe(2);
      });

      it("returns null for an unknown conversation", async () => {
        expect(await d.assistant.fetchConversation(crypto.randomUUID())).toBeNull();
      });

      it("finds a stored visitor message by client id and rejects a duplicate id in one conversation", async () => {
        const conversation = await d.assistant.createConversation({});
        const clientId = crypto.randomUUID();
        await d.assistant.appendMessages(conversation.id, [{ role: "user", content: "Раз", client_message_id: clientId }]);
        expect((await d.assistant.findUserMessageByClientId(conversation.id, clientId))?.id).toBeTruthy();
        expect(await d.assistant.findUserMessageByClientId(conversation.id, crypto.randomUUID())).toBeNull();
        await expect(
          d.assistant.appendMessages(conversation.id, [{ role: "user", content: "Два", client_message_id: clientId }]),
        ).rejects.toThrow();
        expect(await d.assistant.countUserMessages(conversation.id)).toBe(1);
      });

      it("rejects a role the table does not allow", async () => {
        const conversation = await d.assistant.createConversation({});
        await expect(d.assistant.appendMessages(conversation.id, [{ role: "system", content: "x" }])).rejects.toThrow();
      });

      it("counts visitor messages per hashed IP inside the window", async () => {
        const ipHash = `hash-${crypto.randomUUID()}`;
        const one = await d.assistant.createConversation({ ipHash });
        const two = await d.assistant.createConversation({ ipHash });
        const other = await d.assistant.createConversation({ ipHash: `hash-${crypto.randomUUID()}` });
        await d.assistant.appendMessages(one.id, [
          { role: "user", content: "1" },
          { role: "assistant", content: "ok" },
        ]);
        await d.assistant.appendMessages(two.id, [{ role: "user", content: "2" }]);
        await d.assistant.appendMessages(other.id, [{ role: "user", content: "3" }]);
        const since = new Date(Date.now() - 10 * MINUTE).toISOString();
        expect(await d.assistant.countUserMessagesByIp(ipHash, since)).toBe(2);
        expect(await d.assistant.countUserMessagesByIp(ipHash, new Date(Date.now() + HOUR).toISOString())).toBe(0);
      });

      it("marks a conversation Turnstile-checked and stores its proposal and lead link", async () => {
        const conversation = await d.assistant.createConversation({});
        await d.assistant.markConversationTurnstileOk(conversation.id, "hash-b");
        await d.assistant.setConversationProposal(conversation.id, { proposal_id: "p1", summary: "s" });
        const { id: leadId } = await newLead(d, { kind: "ai" });
        await d.assistant.setConversationLead(conversation.id, leadId);
        const stored = await d.assistant.fetchConversation(conversation.id);
        expect(stored).toMatchObject({ turnstile_ok: true, ip_hash: "hash-b", lead_id: leadId });
        expect(stored?.proposal).toEqual({ proposal_id: "p1", summary: "s" });
        expect(await d.assistant.findLeadConversationId(leadId)).toBe(conversation.id);
        expect(await d.assistant.findLeadConversationId(crypto.randomUUID())).toBeNull();
      });

      it("adds token usage to the conversation", async () => {
        const conversation = await d.assistant.createConversation({});
        await d.assistant.addConversationUsage(conversation.id, { inputTokens: 100, outputTokens: 20, costUsd: 0.5 });
        await d.assistant.addConversationUsage(conversation.id, { inputTokens: 50, outputTokens: 5, costUsd: 0.25 });
        expect(await d.assistant.fetchConversation(conversation.id)).toMatchObject({
          input_tokens: 150,
          output_tokens: 25,
          cost_usd: 0.75,
        });
      });

      it("keeps a monthly spend counter that adds up, and trims old months", async () => {
        const month = "2001-03-01";
        const before = await d.assistant.fetchMonthCostUsd(month);
        await d.assistant.addMonthlyUsage(month, { inputTokens: 10, outputTokens: 2, costUsd: 1.5 });
        await d.assistant.addMonthlyUsage(month, { inputTokens: 5, outputTokens: 1, costUsd: 0.5 });
        expect(await d.assistant.fetchMonthCostUsd(month)).toBeCloseTo(before + 2, 6);
        expect(await d.assistant.fetchMonthCostUsd("2001-04-01")).toBe(0);
        expect(await d.assistant.deleteUsageBefore("2001-03-01")).toBe(0);
        expect(await d.assistant.fetchMonthCostUsd(month)).toBeGreaterThan(0);
        expect(await d.assistant.deleteUsageBefore("2001-04-01")).toBeGreaterThanOrEqual(1);
        expect(await d.assistant.fetchMonthCostUsd(month)).toBe(0);
      });

      it("keeps a young conversation when cleaning up with an old cutoff", async () => {
        const conversation = await d.assistant.createConversation({});
        await d.assistant.appendMessages(conversation.id, [{ role: "user", content: "x" }]);
        await d.assistant.deleteConversationsBefore(new Date(Date.now() - 30 * DAY).toISOString());
        expect(await d.assistant.fetchConversation(conversation.id)).not.toBeNull();
        expect(await d.assistant.countUserMessages(conversation.id)).toBe(1);
      });
    });
  });
};

runWriteContract(
  "demo",
  () => {
    resetDemoStore();
    return { leads: demoLeadsDriver, assistant: demoAssistantDriver };
  },
  false,
);

describe("demo store: writes", () => {
  beforeAll(() => {
    resetDemoStore();
  });

  it("deletes conversations older than the cutoff with their messages, and keeps the lead", async () => {
    const store = getDemoStore();
    const { id: leadId } = await demoLeadsDriver.insertLead(
      createLeadSchema.parse({
        kind: "ai",
        name: "Тест",
        phone: "+380 00 000 00 08",
        consent_at: new Date().toISOString(),
        client_request_id: crypto.randomUUID(),
      }),
    );
    const old = await demoAssistantDriver.createConversation({});
    const young = await demoAssistantDriver.createConversation({});
    await demoAssistantDriver.appendMessages(old.id, [{ role: "user", content: "old" }]);
    await demoAssistantDriver.appendMessages(young.id, [{ role: "user", content: "young" }]);
    await demoAssistantDriver.setConversationLead(old.id, leadId);
    const row = store.ai_conversations.find((c) => c.id === old.id);
    if (row) row.created_at = new Date(Date.now() - 31 * DAY).toISOString();

    const messagesBefore = store.ai_messages.length;
    const deleted = await demoAssistantDriver.deleteConversationsBefore(new Date(Date.now() - 30 * DAY).toISOString());
    expect(deleted).toBe(1);
    expect(await demoAssistantDriver.fetchConversation(old.id)).toBeNull();
    expect(await demoAssistantDriver.fetchConversation(young.id)).not.toBeNull();
    expect(store.ai_messages.length).toBe(messagesBefore - 1);
    expect(await demoLeadsDriver.fetchLeadForDelivery(leadId)).not.toBeNull();
    expect(await demoAssistantDriver.findLeadConversationId(leadId)).toBeNull();
  });

  it("seeds sample leads of every kind and one AI lead linked to a conversation with a proposal", () => {
    const seed = buildDemoSeed(Date.now());
    expect(new Set(seed.leads.map((lead) => lead.kind))).toEqual(new Set(["property_request", "general", "ai"]));
    expect(new Set(seed.leads.flatMap((lead) => [lead.plektan_status, lead.telegram_status]))).toEqual(
      new Set(["sent", "failed", "skipped"]),
    );
    const aiLead = seed.leads.find((lead) => lead.kind === "ai");
    const conversation = seed.ai_conversations.find((c) => c.lead_id === aiLead?.id);
    expect(conversation?.proposal).not.toBeNull();
    expect(seed.ai_messages.filter((m) => m.conversation_id === conversation?.id).length).toBeGreaterThan(3);
    const propertyIds = new Set(seed.properties.map((p) => p.id));
    for (const lead of seed.leads) {
      if (lead.property_id) expect(propertyIds.has(lead.property_id)).toBe(true);
      expect(lead.phone).toMatch(/^\+380 00 000 00 0\d$/);
      if (lead.email) expect(lead.email.endsWith("@example.com")).toBe(true);
    }
  });

  it("callers cannot change the store through a returned lead", async () => {
    const { id } = await demoLeadsDriver.insertLead(
      createLeadSchema.parse({
        kind: "general",
        name: "Копія",
        phone: "+380 00 000 00 07",
        consent_at: new Date().toISOString(),
        client_request_id: crypto.randomUUID(),
        payload: { deal: "sell" },
      }),
    );
    const lead = await demoLeadsDriver.fetchLeadForDelivery(id);
    if (lead) lead.name = "Змінено";
    expect((await demoLeadsDriver.fetchLeadForDelivery(id))?.name).toBe("Копія");
  });
});

// Supabase run: needs the local stack and the service role key. Probed with a short timeout; skipped when absent.
const probeSupabase = async (): Promise<boolean> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;
  try {
    const response = await fetch(`${url}/rest/v1/leads?select=id&limit=1`, {
      headers: { apikey: key, authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(1500),
    });
    return response.ok;
  } catch {
    return false;
  }
};

const supabaseReachable = await probeSupabase();

runWriteContract(
  "supabase (local database)",
  // Loaded lazily so a missing database never touches the Supabase client.
  async () => ({
    leads: (await import("./supabase/leads")).supabaseLeadsDriver,
    assistant: (await import("./supabase/assistant")).supabaseAssistantDriver,
  }),
  !supabaseReachable,
);
