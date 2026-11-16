import { cn } from "@/lib/utils";

type CatalogGridProps = {
  children: React.ReactNode;
  /**
   * `sidebar` (default): the catalog, next to its 17rem filter column — 2 columns until 2xl, so the cards keep room
   * for the bigger price and facts (3 columns at 1280–1440 make them ≈ 290–330px). `full`: the whole container width
   * (favorites) — 3 columns from lg.
   */
  layout?: "sidebar" | "full";
  /** Follows the catalog's grid / one column switch (`CatalogViewToggle`): one column of wide cards in the list view. */
  switchable?: boolean;
};

export const CatalogGrid = ({ children, layout = "sidebar", switchable = false }: CatalogGridProps) => (
  <ul
    data-catalog-list={switchable ? "" : undefined}
    className={cn(
      "grid gap-4 sm:grid-cols-2 lg:gap-6",
      layout === "sidebar" ? "2xl:grid-cols-3" : "lg:grid-cols-3",
      switchable && "[.catalog-list-view_&]:grid-cols-1",
    )}
  >
    {children}
  </ul>
);
