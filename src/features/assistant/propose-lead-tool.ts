import "server-only";

import { z } from "zod";

import { AI_PAYMENTS } from "@/features/leads/ai-wishes";
import { LEAD_DEALS, LEAD_LIMITS } from "@/features/leads/lead-form-schema";
import { normalizePhone } from "@/features/leads/phone";
import { setConversationProposal } from "@/lib/db/assistant";
import { ROOM_OPTIONS } from "@/lib/db/properties";
import { CURRENCIES, PROPERTY_TYPES } from "@/lib/db/property-values";
import type { LlmToolDefinition } from "@/lib/llm";

import type { AssistantEvent } from "./assistant-events";
import { roomSchema } from "./search-properties-tool";

export const PROPOSE_LEAD_TOOL = "propose_lead";
export const SUMMARY_MAX = 500;
const TIMING_MAX = 100;
const DISTRICT_MAX = 100;
const MAX_DISTRICTS = 5;

const budgetArgsSchema = z.object({
  from: z.number().finite().nonnegative().nullish(),
  to: z.number().finite().nonnegative().nullish(),
  currency: z.enum(CURRENCIES).nullish(),
});

/** Tool arguments are model output: validated, `null` counts as «not set», nothing trusted. */
export const proposeLeadArgsSchema = z.object({
  summary: z.string().trim().min(1).max(SUMMARY_MAX),
  deal: z.enum(LEAD_DEALS).nullish(),
  property_type: z.enum(PROPERTY_TYPES).nullish(),
  districts: z.array(z.string().trim().min(1).max(DISTRICT_MAX)).max(MAX_DISTRICTS).nullish(),
  rooms: z.array(roomSchema).max(5).nullish(),
  budget: budgetArgsSchema.nullish(),
  payment: z.enum(AI_PAYMENTS).nullish(),
  timing: z.string().trim().max(TIMING_MAX).nullish(),
  /** Prefill only: the visitor confirms or corrects both on the card. */
  name: z.string().nullish(),
  phone: z.string().nullish(),
});

export type ProposeLeadArgs = z.infer<typeof proposeLeadArgsSchema>;

/** What the lead's payload takes from the proposal. Only ever read from the server-stored copy. */
export const proposalWishesSchema = z.object({
  deal: z.enum(LEAD_DEALS).optional(),
  property_type: z.enum(PROPERTY_TYPES).optional(),
  districts: z.array(z.string()).optional(),
  rooms: z.array(z.enum(ROOM_OPTIONS)).optional(),
  budget: z
    .object({ from: z.number().optional(), to: z.number().optional(), currency: z.enum(CURRENCIES) })
    .optional(),
  payment: z.enum(AI_PAYMENTS).optional(),
  timing: z.string().optional(),
});
export type ProposalWishes = z.infer<typeof proposalWishesSchema>;

export const storedProposalSchema = z.object({
  proposal_id: z.uuid(),
  summary: z.string(),
  wishes: proposalWishesSchema,
  created_at: z.string(),
});
export type StoredProposal = z.infer<typeof storedProposalSchema>;

export const proposeLeadDefinition: LlmToolDefinition = {
  name: PROPOSE_LEAD_TOOL,
  description:
    "Show the visitor a request card to confirm (name, phone, consent) so a manager contacts them. Call it when the visitor wants to be contacted, leave a request or book a viewing, or is interested after search results. Pass everything known. This does NOT send anything: the visitor must confirm the card.",
  parameters: {
    type: "object",
    properties: {
      summary: { type: "string", description: `What the visitor wants, in Ukrainian, up to ${SUMMARY_MAX} characters` },
      deal: { type: "string", enum: [...LEAD_DEALS], description: "buy or rent" },
      property_type: { type: "string", enum: [...PROPERTY_TYPES] },
      districts: { type: "array", items: { type: "string" }, description: `Up to ${MAX_DISTRICTS} districts` },
      rooms: { type: "array", items: { type: "string", enum: [...ROOM_OPTIONS] } },
      budget: {
        type: "object",
        properties: {
          from: { type: "number" },
          to: { type: "number" },
          currency: { type: "string", enum: [...CURRENCIES] },
        },
        additionalProperties: false,
      },
      payment: { type: "string", enum: [...AI_PAYMENTS], description: "cash, mortgage or unknown" },
      timing: { type: "string", description: `When the visitor wants to move, up to ${TIMING_MAX} characters` },
      name: { type: "string", description: "Visitor's name if they said it" },
      phone: { type: "string", description: "Visitor's phone if they said it" },
    },
    required: ["summary"],
    additionalProperties: false,
  },
};

export type LeadCardEvent = Extract<AssistantEvent, { type: "lead_card" }>;
export type ProposeLeadOutcome = { content: string; event?: LeadCardEvent };

export type ProposeLeadDeps = {
  storeProposal: (conversationId: string, proposal: StoredProposal) => Promise<void>;
  newId: () => string;
  now: () => Date;
};

const defaultDeps: ProposeLeadDeps = {
  storeProposal: setConversationProposal,
  newId: () => crypto.randomUUID(),
  now: () => new Date(),
};

const failure = (error: string, extra: Record<string, unknown> = {}): ProposeLeadOutcome => ({
  content: JSON.stringify({ error, ...extra }),
});

const toWishes = (args: ProposeLeadArgs): ProposalWishes => {
  const budget = args.budget;
  const hasBudget = budget != null && (budget.from != null || budget.to != null);
  return {
    ...(args.deal ? { deal: args.deal } : {}),
    ...(args.property_type ? { property_type: args.property_type } : {}),
    ...(args.districts?.length ? { districts: args.districts } : {}),
    ...(args.rooms?.length ? { rooms: [...new Set(args.rooms)] } : {}),
    ...(hasBudget
      ? {
          budget: {
            ...(budget.from != null ? { from: budget.from } : {}),
            ...(budget.to != null ? { to: budget.to } : {}),
            currency: budget.currency ?? "USD",
          },
        }
      : {}),
    ...(args.payment ? { payment: args.payment } : {}),
    ...(args.timing ? { timing: args.timing } : {}),
  };
};

/** A prefill that fails the lead form's own rules is dropped, never shown. */
const toPrefill = (args: ProposeLeadArgs): LeadCardEvent["prefill"] => {
  const name = args.name?.trim().slice(0, LEAD_LIMITS.name) ?? "";
  const phone = args.phone ? normalizePhone(args.phone) : null;
  return { ...(name !== "" ? { name } : {}), ...(phone ? { phone } : {}) };
};

/**
 * Runs `propose_lead`: stores the proposal on the conversation (a new one replaces the old) and returns
 * the `lead_card` event. It never creates a lead: only the visitor's confirmation does. Never throws.
 */
export const runProposeLead = async (
  rawArguments: string,
  conversationId: string,
  deps: ProposeLeadDeps = defaultDeps,
): Promise<ProposeLeadOutcome> => {
  let json: unknown;
  try {
    json = JSON.parse(rawArguments);
  } catch {
    return failure("invalid_arguments", { hint: "Arguments must be a JSON object." });
  }
  const parsed = proposeLeadArgsSchema.safeParse(json);
  if (!parsed.success) {
    return failure("invalid_arguments", {
      hint: "Fix the arguments and call again.",
      problems: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".") || "arguments"}: ${i.message}`),
    });
  }
  const args = parsed.data;

  const proposal: StoredProposal = {
    proposal_id: deps.newId(),
    summary: args.summary,
    wishes: toWishes(args),
    created_at: deps.now().toISOString(),
  };
  try {
    await deps.storeProposal(conversationId, proposal);
  } catch {
    console.error("[assistant] could not store the lead proposal");
    return failure("proposal_failed", { hint: "Tell the visitor the request cannot be prepared right now." });
  }

  return {
    content: JSON.stringify({
      status: "card_shown",
      note: "The request card is now shown to the visitor. It is NOT sent yet: the visitor must check the data and press «Надіслати». Do not say the request is sent.",
    }),
    event: { type: "lead_card", proposal_id: proposal.proposal_id, prefill: toPrefill(args), summary: proposal.summary },
  };
};
