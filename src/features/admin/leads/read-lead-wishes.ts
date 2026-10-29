import { z } from "zod";

import { PROPERTY_TYPES } from "@/lib/db/property-values";

/**
 * Field by field and lenient: one malformed key (an AI lead may store anything) drops only that
 * wish, never the others. Unknown keys are ignored.
 */
const wishesSchema = z.object({
  deal: z.enum(["buy", "rent"]).optional().catch(undefined),
  property_type: z.enum(PROPERTY_TYPES).optional().catch(undefined),
  similar_to: z
    .object({ slug: z.string().min(1), title: z.string().min(1) })
    .optional()
    .catch(undefined),
});

export type LeadWishes = {
  deal?: "buy" | "rent";
  propertyType?: (typeof PROPERTY_TYPES)[number];
  similarTo?: { slug: string; title: string };
};

/** What a general / AI lead asked for, from `leads.payload` (jsonb). Not an object → no wishes. */
export const readLeadWishes = (payload: unknown): LeadWishes => {
  const parsed = wishesSchema.safeParse(payload);
  if (!parsed.success) return {};
  const { deal, property_type, similar_to } = parsed.data;
  return {
    ...(deal ? { deal } : {}),
    ...(property_type ? { propertyType: property_type } : {}),
    ...(similar_to ? { similarTo: { slug: similar_to.slug, title: similar_to.title } } : {}),
  };
};

