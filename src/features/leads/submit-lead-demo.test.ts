import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `after()` only works inside a request: run the callbacks by hand, after the submit returned.
const scheduled = vi.hoisted(() => [] as (() => Promise<void> | void)[]);
vi.mock("next/server", () => ({ after: (callback: () => Promise<void> | void) => scheduled.push(callback) }));
// No Next runtime here: the cache wrapper just calls through.
vi.mock("next/cache", () => ({ unstable_cache: <A extends unknown[], R>(fn: (...args: A) => R) => fn, revalidateTag: vi.fn() }));

import { processAssistantLead } from "@/features/assistant/submit-assistant-lead";
import { runAssistantTurn } from "@/features/assistant/run-assistant-turn";
import type { AssistantEvent } from "@/features/assistant/assistant-events";
import { getDemoStore, resetDemoStore } from "@/lib/demo/store";
import { addMonthlyUsage, getLeadTranscript } from "@/lib/db/assistant";
import { retryLeads } from "./retry-leads";
import { processLeadSubmission } from "./submit-lead";

/**
 * The 006 lead pipeline and the 010 assistant on the demo driver, with the service fixtures (spec 011 slice 2).
 * Env is stubbed per case; nothing reaches Supabase (its env is cleared, so a stray client would throw).
 */

const propertyId = () => {
  const row = getDemoStore().properties.find((p) => p.status === "published");
  if (!row) throw new Error("seed has no published property");
  return row.id;
};

const form = (overrides: Record<string, unknown> = {}) => ({
  kind: "general",
  client_request_id: crypto.randomUUID(),
  name: "Тест Тестович",
  phone: "+380 00 000 00 09",
  consent: "on",
  deal: "buy",
  ...overrides,
});

const runScheduled = async () => {
  while (scheduled.length > 0) await scheduled.shift()?.();
};

const lastLead = () => getDemoStore().leads.at(-1);

beforeEach(() => {
  vi.stubEnv("DATA_DRIVER", "demo");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  vi.stubEnv("PLEKTAN_API_KEY", "");
  vi.stubEnv("PLEKTAN_LEADS_FIXTURE", "");
  vi.stubEnv("TELEGRAM_FIXTURE", "");
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
  vi.stubEnv("TELEGRAM_CHAT_ID", "");
  vi.stubEnv("TURNSTILE_SECRET_KEY", "");
  vi.stubEnv("LLM_API_KEY", "");
  resetDemoStore();
  scheduled.length = 0;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("site forms on the demo driver", () => {
  it("a property request creates a lead linked to the property", async () => {
    const id = propertyId();
    const before = getDemoStore().leads.length;
    expect(await processLeadSubmission(form({ kind: "property_request", property_id: id, deal: undefined }))).toEqual({
      status: "ok",
    });
    expect(getDemoStore().leads.length).toBe(before + 1);
    expect(lastLead()).toMatchObject({ kind: "property_request", property_id: id });
  });

  it("a general request creates a lead with its wishes in the payload", async () => {
    await processLeadSubmission(form({ deal: "rent", property_type: "flat" }));
    expect(lastLead()).toMatchObject({ kind: "general", payload: { deal: "rent", property_type: "flat" } });
  });

  it("refuses an unknown property", async () => {
    const before = getDemoStore().leads.length;
    const result = await processLeadSubmission(
      form({ kind: "property_request", property_id: crypto.randomUUID(), deal: undefined }),
    );
    expect(result.status).toBe("error");
    expect(getDemoStore().leads.length).toBe(before);
  });

  it("a double submit makes one lead and one delivery", async () => {
    const raw = form();
    const before = getDemoStore().leads.length;
    await processLeadSubmission(raw);
    await processLeadSubmission(raw);
    expect(getDemoStore().leads.length).toBe(before + 1);
    expect(scheduled.length).toBe(1);
  });

  it("delivery statuses: no keys, no fixtures → skipped", async () => {
    await processLeadSubmission(form());
    await runScheduled();
    expect(lastLead()).toMatchObject({ plektan_status: "skipped", telegram_status: "skipped" });
  });

  it("delivery statuses: fixtures ok → sent, with a Plektan item id", async () => {
    vi.stubEnv("PLEKTAN_LEADS_FIXTURE", "ok");
    vi.stubEnv("TELEGRAM_FIXTURE", "ok");
    await processLeadSubmission(form());
    await runScheduled();
    expect(lastLead()).toMatchObject({ plektan_status: "sent", plektan_attempts: 1, telegram_status: "sent", telegram_attempts: 1 });
    expect(lastLead()?.plektan_item_id).toBeTruthy();
  });

  it("delivery statuses: fixtures fail → failed, retry scheduled, no personal data in the error", async () => {
    vi.stubEnv("PLEKTAN_LEADS_FIXTURE", "fail");
    vi.stubEnv("TELEGRAM_FIXTURE", "fail");
    await processLeadSubmission(form({ name: "Секретне Імя" }));
    await runScheduled();
    const lead = lastLead();
    expect(lead).toMatchObject({ plektan_status: "failed", plektan_attempts: 1, telegram_status: "failed", telegram_attempts: 1 });
    expect(lead?.plektan_next_attempt_at).toBeTruthy();
    expect(JSON.stringify([lead?.plektan_error, lead?.telegram_error])).not.toContain("Секретне");
  });

  it("the cron retry picks a due failed lead and delivers it once the fixture works", async () => {
    vi.stubEnv("PLEKTAN_LEADS_FIXTURE", "fail");
    vi.stubEnv("TELEGRAM_FIXTURE", "ok");
    await processLeadSubmission(form());
    await runScheduled();
    const lead = lastLead();
    if (!lead) throw new Error("no lead");
    expect(lead).toMatchObject({ plektan_status: "failed", telegram_status: "sent" });

    expect(await retryLeads()).toEqual({ processed: 0, sent: 0, failed: 0, alerts: 0 }); // not due yet
    lead.plektan_next_attempt_at = new Date(Date.now() - 1000).toISOString();
    vi.stubEnv("PLEKTAN_LEADS_FIXTURE", "ok");
    expect(await retryLeads()).toMatchObject({ processed: 1, sent: 1 });
    expect(lead).toMatchObject({ plektan_status: "sent", plektan_attempts: 2 });
  });
});

const collect = async (turn: AsyncGenerator<AssistantEvent>) => {
  const events: AssistantEvent[] = [];
  for await (const event of turn) events.push(event);
  return events;
};

describe("assistant on the demo driver", () => {
  it("runs a conversation to an `ai` lead with the server-side payload", async () => {
    vi.stubEnv("PLEKTAN_LEADS_FIXTURE", "ok");
    vi.stubEnv("TELEGRAM_FIXTURE", "ok");

    const first = await collect(
      runAssistantTurn({
        message: "Хочу купити двокімнатну квартиру до 100 000 $",
        pageUrl: "/",
        clientMessageId: crypto.randomUUID(),
        clientIp: "203.0.113.5",
      }),
    );
    const conversation = first.find((event) => event.type === "conversation");
    if (conversation?.type !== "conversation") throw new Error("no conversation event");
    expect(first.some((event) => event.type === "properties")).toBe(true);
    expect(first.at(-1)).toEqual({ type: "done" });

    const second = await collect(
      runAssistantTurn({
        conversationId: conversation.id,
        message: "Так, залиште заявку, нехай мені зателефонують",
        pageUrl: "/",
        clientMessageId: crypto.randomUUID(),
        clientIp: "203.0.113.5",
      }),
    );
    const card = second.find((event) => event.type === "lead_card");
    if (card?.type !== "lead_card") throw new Error(`no lead card: ${JSON.stringify(second)}`);

    const input = {
      conversation_id: conversation.id,
      proposal_id: card.proposal_id,
      client_request_id: crypto.randomUUID(),
      name: "Тест Тестович",
      phone: "+380 00 000 00 09",
      consent: true,
      honeypot: "",
    };
    expect(await processAssistantLead(input)).toEqual({ status: "ok" });
    expect(await processAssistantLead(input)).toEqual({ status: "ok" });
    await runScheduled();

    const leads = getDemoStore().leads.filter((lead) => lead.kind === "ai" && lead.name === "Тест Тестович");
    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({ plektan_status: "sent", telegram_status: "sent" });
    expect(leads[0]?.payload).toMatchObject({ conversation_id: conversation.id });
    expect(getDemoStore().ai_conversations.find((c) => c.id === conversation.id)?.lead_id).toBe(leads[0]?.id);

    const transcript = await getLeadTranscript(leads[0]?.id ?? "");
    expect(transcript.status).toBe("available");
  });

  it("shows the seeded AI lead's transcript", async () => {
    const aiLead = getDemoStore().leads.find((lead) => lead.kind === "ai");
    const transcript = await getLeadTranscript(aiLead?.id ?? "");
    expect(transcript.status).toBe("available");
    if (transcript.status === "available") {
      expect(transcript.messages.some((m) => m.properties?.length)).toBe(true);
    }
  });

  it("stops at the rate limit and at the spend cap", async () => {
    vi.stubEnv("ASSISTANT_RATE_LIMIT", "2");
    const ask = (conversationId?: string) =>
      collect(
        runAssistantTurn({
          conversationId,
          message: "Привіт",
          pageUrl: "/",
          clientMessageId: crypto.randomUUID(),
          clientIp: "203.0.113.9",
        }),
      );
    const one = await ask();
    const id = one.find((event) => event.type === "conversation");
    if (id?.type !== "conversation") throw new Error("no conversation");
    await ask(id.id);
    expect(await ask(id.id)).toContainEqual({ type: "limit", reason: "rate_limit" });

    vi.stubEnv("ASSISTANT_RATE_LIMIT", "100");
    vi.stubEnv("LLM_MONTHLY_BUDGET_USD", "0.0001");
    const month = `${new Date().toISOString().slice(0, 7)}-01`;
    await addMonthlyUsage(month, { inputTokens: 1, outputTokens: 1, costUsd: 1 });
    expect(await ask()).toContainEqual({ type: "limit", reason: "budget" });
  });
});
