const DATE_FORMAT = new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long", year: "numeric" });
const WORDS_PER_MINUTE = 200;

/** «5 листопада 2026» for a stored timestamp. */
export const formatPostDate = (iso: string | null): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : DATE_FORMAT.format(date);
};

const pluralRules = new Intl.PluralRules("uk");

/** «1 хв читання» … «5 хв читання»: words / 200, at least a minute. The abbreviation does not decline. */
export const readingTimeLabel = (markdown: string): string => {
  const words = markdown.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));
  return pluralRules.select(minutes) === "one" && minutes % 100 !== 11 ? `${minutes} хв читання` : `${minutes} хв читання`;
};
