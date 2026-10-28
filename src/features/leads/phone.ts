/** Pure phone helpers: safe on the client and the server. Stored form: `+` and digits only. */

const UA_CODE = "380";
const UA_NATIONAL_LENGTH = 9;
const INTL_MIN_DIGITS = 10;
const INTL_MAX_DIGITS = 15;

/**
 * `+380XXXXXXXXX`, `380…`, `0XXXXXXXXX` (spaces, dashes, parens allowed) → `+380XXXXXXXXX`.
 * Other numbers must start with `+` and have 10–15 digits. Returns null when invalid.
 */
export const normalizePhone = (input: string): string | null => {
  const trimmed = input.trim();
  if (trimmed === "" || /[^\d\s\-().+]/.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  const hasPlus = trimmed.startsWith("+");
  // A `+` anywhere but the start is garbage.
  if (trimmed.indexOf("+") > 0) return null;

  if (!hasPlus) {
    if (digits.startsWith(UA_CODE) && digits.length === UA_CODE.length + UA_NATIONAL_LENGTH) return `+${digits}`;
    if (digits.startsWith("0") && digits.length === UA_NATIONAL_LENGTH + 1) return `+${UA_CODE}${digits.slice(1)}`;
    return null;
  }
  if (digits.startsWith(UA_CODE)) {
    return digits.length === UA_CODE.length + UA_NATIONAL_LENGTH ? `+${digits}` : null;
  }
  return digits.length >= INTL_MIN_DIGITS && digits.length <= INTL_MAX_DIGITS ? `+${digits}` : null;
};

const group = (digits: string, sizes: readonly number[]): string => {
  const parts: string[] = [];
  let at = 0;
  for (const size of sizes) {
    if (at >= digits.length) break;
    parts.push(digits.slice(at, at + size));
    at += size;
  }
  return parts.join(" ");
};

/**
 * Progressive input mask. UA numbers become `+380 XX XXX XX XX` while typing (`0XX…`, `380…` and a bare
 * national number are understood). Other `+…` numbers are `+` and up to 15 digits, ungrouped (country formats differ).
 * Empty input stays empty; a lone `+` stays `+`.
 */
export const formatPhoneInput = (raw: string): string => {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  const hasPlus = trimmed.startsWith("+");
  if (digits === "") return hasPlus ? "+" : "";

  let national: string | null;
  if (digits.startsWith(UA_CODE)) national = digits.slice(UA_CODE.length);
  else if (UA_CODE.startsWith(digits)) return `+${digits}`; // `3`, `38`: still typing the code
  else if (!hasPlus && digits.startsWith("0")) national = digits.slice(1);
  else if (!hasPlus) national = digits;
  else national = null;

  if (national !== null) {
    const ua = national.slice(0, UA_NATIONAL_LENGTH);
    return ua === "" ? `+${UA_CODE}` : `+${UA_CODE} ${group(ua, [2, 3, 2, 2])}`;
  }
  return `+${digits.slice(0, INTL_MAX_DIGITS)}`;
};
