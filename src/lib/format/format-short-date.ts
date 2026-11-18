import { KYIV_TIME_ZONE } from "@/lib/db/admin-lead-filters";

const DAY_MONTH = new Intl.DateTimeFormat("uk-UA", { timeZone: KYIV_TIME_ZONE, day: "numeric", month: "short" });
const DAY_MONTH_YEAR = new Intl.DateTimeFormat("uk-UA", {
  timeZone: KYIV_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});
const YEAR = new Intl.DateTimeFormat("uk-UA", { timeZone: KYIV_TIME_ZONE, year: "numeric" });

/** «16 лист.» in Kyiv time; «16 лист. 2025 р.» when the date is not in the current year. Null for a missing or bad date. */
export const formatShortDate = (iso: string | null, now: Date = new Date()): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return YEAR.format(date) === YEAR.format(now) ? DAY_MONTH.format(date) : DAY_MONTH_YEAR.format(date);
};
