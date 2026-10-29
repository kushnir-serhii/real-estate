import type { Database } from "@/lib/supabase/database.types";

/**
 * What the admin may do with a property. The mode (`settings.properties_source`) decides, `source` stays the origin.
 * Pure: safe to import from client components. The server must enforce the same rules on every write.
 */
export type PropertiesMode = Database["public"]["Enums"]["property_source"];
export type PropertyOrigin = Database["public"]["Enums"]["property_source"];

export type PropertyPermissions = {
  /** `all`: every field is editable; `seo`: only `seo_title` and `seo_description`. */
  fields: "all" | "seo";
  /** Publish / hide. */
  publish: boolean;
  /** Upload, reorder and delete photos. */
  photos: boolean;
};

/** New properties can be created by hand only when the admin is the source of truth. */
export const canCreateProperty = (mode: PropertiesMode): boolean => mode === "admin";

export const canEditProperty = (mode: PropertiesMode, source: PropertyOrigin): PropertyPermissions => {
  if (mode === "admin") return { fields: "all", publish: true, photos: true };
  return { fields: "seo", publish: source === "admin", photos: false };
};
