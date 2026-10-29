import type { ADMIN_PROPERTY_SOURCES, ADMIN_PROPERTY_STATUSES } from "@/lib/db/admin-property-filters";

/** Filter option labels; `all` → «Усі». */
export const STATUS_FILTER_LABELS: Record<(typeof ADMIN_PROPERTY_STATUSES)[number], string> = {
  all: "Усі",
  published: "Опубліковані",
  hidden: "Приховані",
  draft: "Чернетки",
};

export const SOURCE_FILTER_LABELS: Record<(typeof ADMIN_PROPERTY_SOURCES)[number], string> = {
  all: "Усі",
  plektan: "Plektan",
  admin: "Адмінка",
};

export const PRICE_NEGOTIABLE = "Ціна за запитом";
