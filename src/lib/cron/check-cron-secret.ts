import { timingSafeEqual } from "node:crypto";

const bytesOf = (text: string): Buffer => Buffer.from(text, "utf8");

/** Constant-time comparison that doesn't leak the secret's length either (both sides are padded to the same size). */
const secretMatches = (given: string, expected: string): boolean => {
  const size = Math.max(given.length, expected.length) * 4 + 4;
  const a = Buffer.alloc(size);
  const b = Buffer.alloc(size);
  bytesOf(given).copy(a);
  bytesOf(expected).copy(b);
  return timingSafeEqual(a, b) && bytesOf(given).length === bytesOf(expected).length;
};

/** True only for `Authorization: Bearer <CRON_SECRET>`. An unset secret never authorizes, not even an empty bearer. */
export const isCronAuthorized = (request: Request): boolean => {
  const expected = process.env.CRON_SECRET ?? "";
  const header = request.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  return expected !== "" && given !== "" && secretMatches(given, expected);
};
