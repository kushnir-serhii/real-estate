import type { ADMIN_LEAD_KINDS } from "@/lib/db/admin-lead-filters";

export type LeadKind = (typeof ADMIN_LEAD_KINDS)[number];

export const LEAD_KIND_LABELS = {
  property_request: "Запит на об'єкт",
  general: "Загальний запит",
  ai: "AI-помічник",
} as const satisfies Record<LeadKind, string>;
