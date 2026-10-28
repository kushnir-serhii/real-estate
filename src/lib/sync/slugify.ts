const LETTERS: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ie", ж: "zh", з: "z", и: "y", і: "i",
  ї: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
  ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ь: "", ю: "iu", я: "ia",
};

/** KMU 2010: these letters read differently at the start of a word. */
const WORD_START: Record<string, string> = { є: "ye", ї: "yi", й: "y", ю: "yu", я: "ya" };

const APOSTROPHES = new Set(["'", "’", "ʼ", "`", "‘"]);

const MAX_BASE_LENGTH = 60;
const SUFFIX_LENGTH = 6;

/** Ukrainian official (KMU 2010) transliteration, lowercase; anything outside [a-z0-9] becomes "-". */
export const transliterate = (text: string): string => {
  const lower = text.toLowerCase();
  let out = "";
  let atWordStart = true;
  for (let index = 0; index < lower.length; index += 1) {
    const char = lower[index] ?? "";
    if (APOSTROPHES.has(char)) continue;
    if (char === "г" && lower[index - 1] === "з") {
      out += "gh"; // "зг" -> "zgh"
      atWordStart = false;
      continue;
    }
    const mapped = (atWordStart ? WORD_START[char] : undefined) ?? LETTERS[char];
    if (mapped !== undefined) {
      out += mapped;
      atWordStart = false;
    } else if (/[a-z0-9]/.test(char)) {
      out += char;
      atWordStart = false;
    } else {
      out += "-";
      atWordStart = true;
    }
  }
  return out;
};

/** Transliterated, dash-separated, at most `max` chars, cut on a word boundary. */
export const slugifyBase = (text: string, max: number = MAX_BASE_LENGTH): string => {
  const slug = transliterate(text).replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (slug.length <= max) return slug;
  const cut = slug.slice(0, max + 1);
  const boundary = cut.lastIndexOf("-");
  return (boundary > 0 ? cut.slice(0, boundary) : slug.slice(0, max)).replace(/-$/, "");
};

const randomSuffix = (): string => {
  const bytes = new Uint8Array(SUFFIX_LENGTH / 2);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

/**
 * `2-kimnatna-kvartyra-oboloni-3f9a1c`: slug of the title + 6 hex chars. Only for new rows:
 * an existing slug is never regenerated. The suffix is injectable for tests.
 */
export const createSlug = (title: string, suffix: string = randomSuffix()): string => {
  const base = slugifyBase(title);
  return base === "" ? suffix : `${base}-${suffix}`;
};
