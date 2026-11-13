export type UaPhone = {
  /** Shown to people: `+380 67 123 45 67`. */
  display: string;
  /** For links: `tel:+380671234567`. */
  href: string;
  /** E.164: `+380671234567` (Viber, JSON-LD). */
  e164: string;
};

/** Separators people and dashboards put into numbers; anything else makes the value invalid. */
const SEPARATORS = /[\s\-().]/g;
const UA_E164 = /^\+?380(\d{2})(\d{3})(\d{2})(\d{2})$/;

/** A Ukrainian number (`+380` + 9 digits, separators allowed) → display / `tel:` / E.164; anything else → null. */
export const formatUaPhone = (input: string | null | undefined): UaPhone | null => {
  const match = (input ?? "").replace(SEPARATORS, "").match(UA_E164);
  if (!match) return null;
  const [, operator, a, b, c] = match;
  const e164 = `+380${operator}${a}${b}${c}`;
  return { display: `+380 ${operator} ${a} ${b} ${c}`, href: `tel:${e164}`, e164 };
};

/** `formatUaPhone`, or the fallback when the value is empty or not a Ukrainian number. */
export const resolveUaPhone = (input: string | null | undefined, fallback: UaPhone): UaPhone =>
  formatUaPhone(input) ?? fallback;
