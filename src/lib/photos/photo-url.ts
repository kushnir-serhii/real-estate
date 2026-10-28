/**
 * Public URL of a stored photo. With `NEXT_PUBLIC_R2_PUBLIC_URL` set it points to R2;
 * when empty the key is served from `public/` (local placeholders).
 */
export const photoUrl = (key: string): string => {
  const base = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "").replace(/\/+$/, "");
  const path = key.replace(/^\/+/, "");
  return `${base}/${path}`;
};
