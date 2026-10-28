import type { DEALS, PROPERTY_TYPES } from "@/lib/db/property-values";

export const DEAL_LABELS: Record<(typeof DEALS)[number], string> = {
  sell: "Продаж",
  rent_long: "Довгострокова оренда",
  rent_day: "Подобова оренда",
};

export const PROPERTY_TYPE_LABELS: Record<(typeof PROPERTY_TYPES)[number], string> = {
  flat: "Квартира",
  house: "Будинок",
  commercial: "Комерційна",
  plot: "Ділянка",
};
