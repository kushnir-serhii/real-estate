const KYIV_TIME_ZONE = "Europe/Kyiv";

/** Overlap subtracted from the run start, so a property modified while a run was in progress isn't missed. */
export const SYNC_CURSOR_OVERLAP_MS = 10 * 60 * 1000;

/** Plektan `after_date` format: `YYYY-MM-DD HH:MM`, Kyiv local time. */
export const formatKyivMinute = (date: Date): string => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: KYIV_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const get = (type: string): string => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
};

/** The cursor to store after a run that started at `runStart`. */
export const createSyncCursor = (runStart: Date): string =>
  formatKyivMinute(new Date(runStart.getTime() - SYNC_CURSOR_OVERLAP_MS));
