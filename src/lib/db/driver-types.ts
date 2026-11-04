import type { Agent } from "./agents";
import type {
  AiConversation,
  AiHistoryMessage,
  AiMessage,
  AiUsageDelta,
  NewAiConversation,
  NewAiMessage,
  StoredProposalJson,
} from "./assistant";
import type {
  CreateLeadResult,
  LeadDeliveryUpdate,
  LeadForDelivery,
  LeadToAlert,
  ParsedLead,
  PropertyBrief,
} from "./leads";
import type { Page } from "./pages";
import type {
  FavoriteProperty,
  PropertyBySlug,
  PropertyFilters,
  PropertyPage,
  PublishedProperty,
  SimilarTo,
  SitemapProperty,
} from "./property-query";
import type { ExchangeRates, Settings } from "./settings";

/**
 * The public reads every data driver implements (spec 011). Callers never see this: they import the facades
 * in `src/lib/db/<domain>.ts`, which add caching and pick the driver. Implementations: `src/lib/db/supabase/`
 * (today's queries) and `src/lib/demo/db/` (in-memory store that mirrors the RLS rules).
 */
export type PropertiesDriver = {
  fetchPublishedProperties: (filters: PropertyFilters) => Promise<PropertyPage>;
  fetchPropertyBySlug: (slug: string) => Promise<PropertyBySlug | null>;
  fetchPropertiesByIds: (ids: string[]) => Promise<FavoriteProperty[]>;
  fetchSimilarProperties: (target: SimilarTo) => Promise<PublishedProperty[]>;
  fetchPublishedDistricts: () => Promise<string[]>;
  fetchSitemapProperties: () => Promise<SitemapProperty[]>;
};

export type PagesDriver = {
  fetchPage: (slug: string) => Promise<Page | null>;
};

export type AgentsDriver = {
  fetchActiveAgents: () => Promise<Agent[]>;
};

export type SettingsDriver = {
  fetchSettings: () => Promise<Settings>;
  fetchExchangeRates: () => Promise<ExchangeRates>;
};

/** Leads and their delivery state. Service-role access only: leads are never public (RLS: no policies). */
export type LeadsDriver = {
  /** Idempotent on `client_request_id` (unique): a repeat returns the existing lead with `created: false`. */
  insertLead: (lead: ParsedLead) => Promise<CreateLeadResult>;
  fetchLeadForDelivery: (id: string) => Promise<LeadForDelivery | null>;
  updateLeadDelivery: (id: string, update: LeadDeliveryUpdate) => Promise<void>;
  fetchDueLeadIds: (params: { now: Date; staleBefore: Date; maxAttempts: number; limit: number }) => Promise<string[]>;
  fetchLeadsToAlert: (params: { maxAttempts: number; limit: number }) => Promise<LeadToAlert[]>;
  markPlektanAlerted: (id: string, at: Date) => Promise<void>;
  /** True only for a `published` property. */
  isPropertyPublished: (id: string) => Promise<boolean>;
  /** Any property by id (published or not), for the «similar to» wish. */
  fetchPropertyBrief: (id: string) => Promise<PropertyBrief | null>;
};

/** AI assistant storage: conversations, messages, usage counter. Service-role access only. */
export type AssistantDriver = {
  createConversation: (input: NewAiConversation) => Promise<AiConversation>;
  fetchConversation: (id: string) => Promise<AiConversation | null>;
  markConversationTurnstileOk: (id: string, ipHash: string) => Promise<void>;
  findUserMessageByClientId: (
    conversationId: string,
    clientMessageId: string,
  ) => Promise<Pick<AiMessage, "id" | "created_at"> | null>;
  countUserMessages: (conversationId: string) => Promise<number>;
  countUserMessagesByIp: (ipHash: string, sinceIso: string) => Promise<number>;
  fetchMonthCostUsd: (month: string) => Promise<number>;
  /** Atomic add to the month's counter (the `add_ai_usage` SQL function). */
  addMonthlyUsage: (month: string, usage: AiUsageDelta) => Promise<void>;
  deleteConversationsBefore: (cutoffIso: string) => Promise<number>;
  deleteUsageBefore: (cutoffMonth: string) => Promise<number>;
  fetchConversationMessages: (conversationId: string, limit: number) => Promise<AiHistoryMessage[]>;
  appendMessages: (conversationId: string, messages: readonly NewAiMessage[]) => Promise<void>;
  addConversationUsage: (conversationId: string, usage: AiUsageDelta) => Promise<void>;
  setConversationProposal: (conversationId: string, proposal: StoredProposalJson) => Promise<void>;
  setConversationLead: (conversationId: string, leadId: string) => Promise<void>;
  /** The newest conversation linked to the lead, or null (cleaned up). */
  findLeadConversationId: (leadId: string) => Promise<string | null>;
};
