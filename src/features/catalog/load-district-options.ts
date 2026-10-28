import "server-only";

import { getPublishedDistricts } from "@/lib/db/properties";
import { getSupabasePublicEnvOrNull } from "@/lib/supabase/env";

/** District options for the filter form; the form still works (without the field) if they fail. */
export const loadDistrictOptions = async (): Promise<string[]> => {
  if (getSupabasePublicEnvOrNull() === null) return [];
  try {
    return await getPublishedDistricts();
  } catch (error) {
    console.warn("catalog: districts unavailable", error instanceof Error ? error.message : error);
    return [];
  }
};
