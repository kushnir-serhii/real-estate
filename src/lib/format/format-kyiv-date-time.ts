import { KYIV_TIME_ZONE } from "@/lib/db/admin-lead-filters";

const DATE = new Intl.DateTimeFormat("uk-UA", {
  timeZone: KYIV_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const TIME = new Intl.DateTimeFormat("uk-UA", {
  timeZone: KYIV_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

/** `29.10.2026` + `14:05` in Kyiv time (`uk-UA`), whatever the server's time zone is. */
export const formatKyivDateTime = (iso: string): { date: string; time: string } => {
  const d = new Date(iso);
  return { date: DATE.format(d), time: TIME.format(d) };
};
