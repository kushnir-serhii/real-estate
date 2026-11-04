/**
 * Demo admin session (spec 011): a signed cookie, no accounts. HMAC-SHA256 through Web Crypto, so the same
 * code runs in Node, the Edge proxy and Workers. No `server-only` import: `proxy.ts` uses it too.
 * The secret is `DEMO_SESSION_SECRET`; empty means a fixed dev secret (and one warning), fine locally,
 * not for a public demo.
 */

export const DEMO_COOKIE_NAME = "demo_admin_session";
export const DEMO_SESSION_MAX_AGE_S = 7 * 24 * 60 * 60;

/** The demo admin. The uuid matches the `admins` row of the seed. */
export const DEMO_ADMIN = { userId: "00000000-0000-4000-8000-0000000000b1", email: "demo@example.com" } as const;

const DEV_SECRET = "demo-dev-secret-not-for-production";

export type DemoSession = { role: "admin"; exp: number };

const encoder = new TextEncoder();
const decoder = new TextDecoder();

let warned = false;

const readSecret = (): string => {
  const value = process.env.DEMO_SESSION_SECRET?.trim() ?? "";
  if (value !== "") return value;
  if (!warned) {
    warned = true;
    console.warn("DEMO_SESSION_SECRET is empty: the demo admin cookie is signed with a fixed dev secret. Set it in a public deploy.");
  }
  return DEV_SECRET;
};

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/** Null for anything that isn't valid base64url. */
const fromBase64Url = (text: string): Uint8Array<ArrayBuffer> | null => {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
};

const importKey = (usage: "sign" | "verify"): Promise<CryptoKey> =>
  crypto.subtle.importKey("raw", encoder.encode(readSecret()), { name: "HMAC", hash: "SHA-256" }, false, [usage]);

/** `<base64url payload>.<base64url signature>`; valid for `DEMO_SESSION_MAX_AGE_S` from `nowMs`. */
export const signDemoSession = async (nowMs: number = Date.now()): Promise<string> => {
  const session: DemoSession = { role: "admin", exp: Math.floor(nowMs / 1000) + DEMO_SESSION_MAX_AGE_S };
  const payload = toBase64Url(encoder.encode(JSON.stringify(session)));
  const signature = await crypto.subtle.sign("HMAC", await importKey("sign"), encoder.encode(payload));
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
};

/** The session when the signature matches (`subtle.verify` compares in constant time) and it hasn't expired. */
export const verifyDemoSession = async (
  token: string | undefined | null,
  nowMs: number = Date.now(),
): Promise<DemoSession | null> => {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  const signatureBytes = fromBase64Url(signature);
  const payloadBytes = fromBase64Url(payload);
  if (signatureBytes === null || payloadBytes === null) return null;

  const valid = await crypto.subtle.verify("HMAC", await importKey("verify"), signatureBytes, encoder.encode(payload));
  if (!valid) return null;

  try {
    const data: unknown = JSON.parse(decoder.decode(payloadBytes));
    if (typeof data !== "object" || data === null) return null;
    const role: unknown = "role" in data ? data.role : undefined;
    const exp: unknown = "exp" in data ? data.exp : undefined;
    if (role !== "admin" || typeof exp !== "number" || !Number.isFinite(exp)) return null;
    if (exp * 1000 <= nowMs) return null;
    return { role: "admin", exp };
  } catch {
    return null;
  }
};
