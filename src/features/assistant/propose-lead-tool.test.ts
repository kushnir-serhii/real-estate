import { describe, expect, it, vi } from "vitest";

import { assistantEventSchema } from "./assistant-events";
import { proposeLeadArgsSchema, runProposeLead, storedProposalSchema } from "./propose-lead-tool";
import type { ProposeLeadDeps, StoredProposal } from "./propose-lead-tool";

const PROPOSAL_ID = "0b0e1d2a-6f3c-4c7e-9a41-2f7d8c9b1a10";
const CONVERSATION_ID = "7d6a1f0e-3c1b-4a53-9d2f-0a1b2c3d4e5f";

const depsOf = (over: Partial<ProposeLeadDeps> = {}) => {
  const storeProposal = vi.fn<(id: string, proposal: StoredProposal) => Promise<void>>(async () => undefined);
  const deps: ProposeLeadDeps = {
    storeProposal,
    newId: () => PROPOSAL_ID,
    now: () => new Date("2026-10-29T10:00:00.000Z"),
    ...over,
  };
  return { deps, storeProposal };
};

const run = (args: unknown, deps: ProposeLeadDeps) => runProposeLead(JSON.stringify(args), CONVERSATION_ID, deps);

describe("proposeLeadArgsSchema", () => {
  it("needs a summary of at most 500 characters", () => {
    expect(proposeLeadArgsSchema.safeParse({}).success).toBe(false);
    expect(proposeLeadArgsSchema.safeParse({ summary: "   " }).success).toBe(false);
    expect(proposeLeadArgsSchema.safeParse({ summary: "а".repeat(501) }).success).toBe(false);
    expect(proposeLeadArgsSchema.safeParse({ summary: "а".repeat(500) }).success).toBe(true);
  });

  it("rejects unknown enum values, too many districts and long timing; accepts nulls", () => {
    const ok = { summary: "Хоче квартиру" };
    expect(proposeLeadArgsSchema.safeParse({ ...ok, deal: "swap" }).success).toBe(false);
    expect(proposeLeadArgsSchema.safeParse({ ...ok, payment: "crypto" }).success).toBe(false);
    expect(proposeLeadArgsSchema.safeParse({ ...ok, districts: ["a", "b", "c", "d", "e", "f"] }).success).toBe(false);
    expect(proposeLeadArgsSchema.safeParse({ ...ok, timing: "x".repeat(101) }).success).toBe(false);
    expect(proposeLeadArgsSchema.safeParse({ ...ok, deal: null, budget: null, rooms: null, name: null }).success).toBe(
      true,
    );
  });
});

describe("runProposeLead", () => {
  it("stores the validated proposal, emits the lead_card event and tells the model it is not sent", async () => {
    const { deps, storeProposal } = depsOf();
    const out = await run(
      {
        summary: "Хоче купити 2-кімнатну на Печерську",
        deal: "buy",
        property_type: "flat",
        districts: ["Печерський"],
        rooms: [2, "2", "3"],
        budget: { to: 80000 },
        payment: "mortgage",
        timing: "за місяць",
        name: " Іван ",
        phone: "050 123 45 67",
      },
      deps,
    );

    expect(storeProposal).toHaveBeenCalledTimes(1);
    const [conversationId, proposal] = storeProposal.mock.calls[0] ?? [];
    expect(conversationId).toBe(CONVERSATION_ID);
    expect(proposal).toEqual({
      proposal_id: PROPOSAL_ID,
      summary: "Хоче купити 2-кімнатну на Печерську",
      wishes: {
        deal: "buy",
        property_type: "flat",
        districts: ["Печерський"],
        rooms: ["2", "3"],
        budget: { to: 80000, currency: "USD" },
        payment: "mortgage",
        timing: "за місяць",
      },
      created_at: "2026-10-29T10:00:00.000Z",
    });
    expect(storedProposalSchema.safeParse(proposal).success).toBe(true);

    expect(out.event).toEqual({
      type: "lead_card",
      proposal_id: PROPOSAL_ID,
      prefill: { name: "Іван", phone: "+380501234567" },
      summary: "Хоче купити 2-кімнатну на Печерську",
    });
    expect(assistantEventSchema.safeParse(out.event).success).toBe(true);
    expect(out.content).toContain("card_shown");
    expect(out.content).toContain("NOT sent");
  });

  it("drops an invalid phone from the prefill but still shows the card", async () => {
    const { deps } = depsOf();
    const out = await run({ summary: "Запит", phone: "12345" }, deps);
    expect(out.event).toEqual({ type: "lead_card", proposal_id: PROPOSAL_ID, prefill: {}, summary: "Запит" });
  });

  it("returns an error result and no event for invalid arguments or bad JSON", async () => {
    const { deps, storeProposal } = depsOf();
    const bad = await run({ deal: "buy" }, deps);
    expect(bad.event).toBeUndefined();
    expect(JSON.parse(bad.content)).toMatchObject({ error: "invalid_arguments" });
    const notJson = await runProposeLead("{oops", CONVERSATION_ID, deps);
    expect(notJson.event).toBeUndefined();
    expect(JSON.parse(notJson.content)).toMatchObject({ error: "invalid_arguments" });
    expect(storeProposal).not.toHaveBeenCalled();
  });

  it("shows no card when the proposal could not be stored", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { deps } = depsOf({ storeProposal: async () => Promise.reject(new Error("db down")) });
    const out = await run({ summary: "Запит" }, deps);
    expect(out.event).toBeUndefined();
    expect(JSON.parse(out.content)).toMatchObject({ error: "proposal_failed" });
  });
});
