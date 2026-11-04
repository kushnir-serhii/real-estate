import type { Database } from "@/lib/supabase/database.types";

type Json = Database["public"]["Tables"]["leads"]["Row"]["payload"];

/** What a jsonb column holds: a plain JSON copy (undefined keys dropped), never a shared reference. */
export const toJson = (value: unknown): Json =>
  value === undefined || value === null ? null : (JSON.parse(JSON.stringify(value)) as Json); // JSON.parse output is Json by construction
