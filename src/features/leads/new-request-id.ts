const UUID_TEMPLATE = "10000000-1000-4000-8000-100000000000";

/**
 * A fresh `client_request_id` (uuid v4). `crypto.randomUUID` exists only in secure contexts (not on a
 * phone opening the dev server over http), so there is a `getRandomValues` fallback.
 */
export const newRequestId = (): string => {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return UUID_TEMPLATE.replace(/[018]/g, (c) =>
    (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16),
  );
};
