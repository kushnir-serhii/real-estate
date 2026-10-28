import type { Deal, Sort } from "./catalog-params";

/** Native `<select>` styled like `Input` (matches the home quick search). */
export const SELECT_CLASS =
  "h-11 w-full min-w-0 rounded-lg border border-control bg-background px-3 text-base text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export const DEAL_OPTIONS = [
  { value: "sell", label: "Купити" },
  { value: "rent_long", label: "Орендувати" },
  { value: "rent_day", label: "Подобово" },
] as const satisfies readonly { value: Deal; label: string }[];

export const SORT_OPTIONS = [
  { value: "newest", label: "Спочатку нові" },
  { value: "price_asc", label: "Спочатку дешевші" },
  { value: "price_desc", label: "Спочатку дорожчі" },
  { value: "area_asc", label: "Менша площа" },
  { value: "area_desc", label: "Більша площа" },
] as const satisfies readonly { value: Sort; label: string }[];
