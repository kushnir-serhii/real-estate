/**
 * Every R2 object key a photo row points to (the main key and each size). Only keys under `properties/` are
 * returned: the seed's placeholders live in the repo's `public/`, not in R2, and must never be deleted.
 * Same rule as the sync's photo cleanup.
 */
export const photoObjectKeys = (photo: { r2_key: string; sizes: unknown }): string[] => {
  const keys = new Set<string>([photo.r2_key]);
  const { sizes } = photo;
  if (typeof sizes === "object" && sizes !== null && !Array.isArray(sizes)) {
    for (const value of Object.values(sizes)) if (typeof value === "string") keys.add(value);
  }
  return [...keys].filter((key) => key.startsWith("properties/"));
};
