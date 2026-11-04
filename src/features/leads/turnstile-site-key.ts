/** Public Turnstile site key. Empty (local work) = no widget, and the server's fixture lets an empty token pass. */
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
