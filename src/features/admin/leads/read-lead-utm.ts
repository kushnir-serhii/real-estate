import { z } from "zod";

const utmSchema = z.record(z.string(), z.unknown());

/** `leads.utm` (jsonb) as `[key, value]` pairs: string values only, non-empty, in stored order. */
export const readLeadUtm = (utm: unknown): [string, string][] => {
  const parsed = utmSchema.safeParse(utm);
  if (!parsed.success) return [];
  return Object.entries(parsed.data).flatMap(([key, value]): [string, string][] =>
    typeof value === "string" && value.trim() !== "" ? [[key, value]] : [],
  );
};
