import type { PageContent } from "@/constants/pages";
import type { PropertySeoValues } from "@/features/admin/properties/property-form-schema";
import type { AdminLeadFilters } from "./admin-lead-filters";
import type { AdminLeadDetail, AdminLeadPage } from "./admin-leads";
import type {
  AdminProperty,
  AdminPropertyPage,
  PropertySlugResult,
  PropertyWriteColumns,
  DeleteAdminDraftResult,
  SourceSwitchCounts,
} from "./admin-properties";
import type { AdminPropertyFilters } from "./admin-property-filters";
import type { NewPhotoRow, PhotoWriteResult, StoredPhotoRow } from "./admin-property-photos";
import type { PropertiesMode } from "./property-permissions";
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
import type { PostInput } from "./post-schemas";
import type {
  AdminPost,
  AdminPostFilters,
  AdminPostPage,
  PostDetail,
  PostFilters,
  PostListItem,
  PostPage,
  SitemapPost,
} from "./post-query";
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

/** Admin reads of leads (spec 007). Service-role / admin-session access only; the caller ran `requireAdmin()`. */
export type AdminLeadsDriver = {
  fetchAdminLeads: (filters: AdminLeadFilters) => Promise<AdminLeadPage>;
  /** `id` is a valid uuid. */
  fetchAdminLead: (id: string) => Promise<AdminLeadDetail | null>;
};

/** Static pages for the admin (spec 009): raw rows; the facade adds the built-in defaults. */
export type AdminPagesDriver = {
  fetchPageRows: (slugs: readonly string[]) => Promise<Page[]>;
  fetchPageRow: (slug: string) => Promise<Page | null>;
  upsertPage: (slug: string, content: PageContent) => Promise<void>;
  deletePage: (slug: string) => Promise<void>;
};

/** Photo rows of the admin (spec 008). Positions are 0..n-1, the cover is 0. */
export type AdminPropertyPhotosDriver = {
  countPhotos: (propertyId: string) => Promise<number>;
  appendPhoto: (propertyId: string, photo: NewPhotoRow) => Promise<StoredPhotoRow>;
  reorderPropertyPhotos: (propertyId: string, orderedIds: readonly string[]) => Promise<PhotoWriteResult>;
  deletePropertyPhoto: (propertyId: string, photoId: string) => Promise<PhotoWriteResult>;
};

/** Admin properties (spec 008): storage only. Geocoding, price derivation and the slug rule live in the facade. */
export type AdminPropertiesDriver = {
  fetchAdminProperties: (filters: AdminPropertyFilters) => Promise<AdminPropertyPage>;
  fetchSourceSwitchCounts: () => Promise<SourceSwitchCounts>;
  setPropertiesSource: (mode: PropertiesMode) => Promise<void>;
  saveExchangeRates: (rates: ExchangeRates) => Promise<{ recomputed: number }>;
  /** `id` is a valid uuid. */
  fetchAdminProperty: (id: string) => Promise<AdminProperty | null>;
  fetchActiveAgentOptions: () => Promise<{ id: string; name: string }[]>;
  agentExists: (agentId: string) => Promise<boolean>;
  /** New row: `source = 'admin'`, `status = 'hidden'` (a draft). */
  insertProperty: (
    columns: PropertyWriteColumns,
    slug: string,
  ) => Promise<{ ok: true; id: string; slug: string } | { ok: false; reason: "slug_taken" }>;
  updateProperty: (
    id: string,
    columns: PropertyWriteColumns,
    slug: string,
  ) => Promise<{ ok: true; slug: string } | { ok: false; reason: "slug_taken" | "not_found" }>;
  updatePropertySeo: (id: string, seo: PropertySeoValues) => Promise<PropertySlugResult>;
  fetchPublishFields: (id: string) => Promise<PublishFields | null>;
  setPublished: (id: string, publishedAt: string) => Promise<void>;
  hideProperty: (id: string) => Promise<PropertySlugResult>;
  deleteDraft: (id: string) => Promise<DeleteAdminDraftResult>;
};

export type PublishFields = {
  slug: string;
  title: string;
  deal: AdminProperty["deal"];
  property_type: AdminProperty["property_type"];
  locality: string | null;
  published_at: string | null;
};

/** Public blog reads (spec 015): published posts only, as RLS returns them. */
export type PostsDriver = {
  fetchPublishedPosts: (filters: PostFilters) => Promise<PostPage>;
  fetchPostBySlug: (slug: string) => Promise<PostDetail | null>;
  fetchLatestPosts: (count: number) => Promise<PostListItem[]>;
  fetchSitemapPosts: () => Promise<SitemapPost[]>;
};

/** What the admin writes to `posts`: the validated input plus the `published_at` the facade decided. */
export type PostWriteColumns = PostInput & { published_at: string | null };

/** Admin blog storage (spec 015). Service-role access only; the slug lock and `published_at` rules live in the facade. */
export type AdminPostsDriver = {
  fetchAdminPosts: (filters: AdminPostFilters) => Promise<AdminPostPage>;
  /** `id` is a valid uuid. */
  fetchAdminPost: (id: string) => Promise<AdminPost | null>;
  insertPost: (
    columns: PostWriteColumns,
  ) => Promise<{ ok: true; id: string } | { ok: false; reason: "slug_taken" | "author_not_found" }>;
  updatePost: (
    id: string,
    columns: PostWriteColumns,
  ) => Promise<{ ok: true } | { ok: false; reason: "slug_taken" | "author_not_found" | "not_found" }>;
  /** Returns the cover key so the caller can delete the object. */
  deletePost: (id: string) => Promise<{ ok: true; cover_key: string | null } | { ok: false; reason: "not_found" }>;
  /** Replaces the links: `propertyIds` are distinct, at most 3, position = index. */
  replacePostProperties: (
    id: string,
    propertyIds: readonly string[],
  ) => Promise<{ ok: true } | { ok: false; reason: "not_found" | "property_not_found" }>;
  setPostCover: (
    id: string,
    cover: { key: string; alt: string | null } | null,
  ) => Promise<{ ok: true; previous_key: string | null } | { ok: false; reason: "not_found" }>;
};
