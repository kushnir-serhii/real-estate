import type { PublishedProperty } from "@/lib/db/properties";

/** Status of a recently hidden property: «Продано» for sales, «Вже здано» for rents. */
export const soldStatusLabel = (deal: PublishedProperty["deal"]): string => {
  switch (deal) {
    case "sell":
      return "Продано";
    case "rent_long":
    case "rent_day":
      return "Вже здано";
    default: {
      const unreachable: never = deal;
      return unreachable;
    }
  }
};
