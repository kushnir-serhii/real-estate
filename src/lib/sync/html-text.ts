/** Small HTML helpers for Plektan text (prices, `promo_text`). Pure, no dependencies. */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  laquo: "«",
  raquo: "»",
  ldquo: "“",
  rdquo: "”",
  lsquo: "‘",
  rsquo: "’",
  bdquo: "„",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  asymp: "≈",
  euro: "€",
  deg: "°",
  sup2: "²",
  sup3: "³",
  middot: "·",
  bull: "•",
  times: "×",
  copy: "©",
  reg: "®",
  trade: "™",
  plusmn: "±",
  frac12: "½",
  shy: "",
};

const codePointToString = (code: number): string => {
  if (!Number.isInteger(code) || code < 0 || code > 0x10ffff) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
};

/** Decodes named (common) and numeric HTML entities in one pass; unknown ones stay as they are. */
export const decodeHtmlEntities = (text: string): string =>
  text.replace(
    /&(?:#(\d+)|#[xX]([0-9a-fA-F]+)|([a-zA-Z][a-zA-Z0-9]*));/g,
    (match, dec?: string, hex?: string, name?: string) => {
      if (dec !== undefined) return codePointToString(Number.parseInt(dec, 10));
      if (hex !== undefined) return codePointToString(Number.parseInt(hex, 16));
      if (name !== undefined) return NAMED_ENTITIES[name] ?? NAMED_ENTITIES[name.toLowerCase()] ?? match;
      return match;
    },
  );

/**
 * HTML to plain text: block boundaries become line breaks (paragraphs keep a blank line),
 * tags are dropped, entities decoded. Empty result -> null.
 */
export const htmlToPlainText = (html: string | null | undefined): string | null => {
  if (html === null || html === undefined) return null;
  const withBreaks = html
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/\s*(?:p|div|h[1-6]|ul|ol|table)\s*>/gi, "\n\n")
    .replace(/<\s*\/\s*(?:li|tr)\s*>/gi, "\n")
    .replace(/<\s*li\b[^>]*>/gi, "• ")
    .replace(/<[^>]*>/g, "");
  const text = decodeHtmlEntities(withBreaks)
    .replace(/\r\n?/g, "\n")
    .replace(/[  \t ]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text === "" ? null : text;
};
