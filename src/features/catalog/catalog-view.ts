/** localStorage key: how the catalog shows its cards. */
export const CATALOG_VIEW_KEY = "diplomat-hall:catalog-view";

export const CATALOG_VIEWS = ["grid", "list"] as const;
export type CatalogView = (typeof CATALOG_VIEWS)[number];

export const DEFAULT_CATALOG_VIEW: CatalogView = "grid";

/**
 * Class on <html> while the list view is on. A class, like the theme's `dark`, not a `data-*` attribute: React drops
 * unknown attributes on <html> when it hydrates, while the class survives (`suppressHydrationWarning` on <html>).
 */
export const CATALOG_LIST_CLASS = "catalog-list-view";

export const isCatalogView = (value: unknown): value is CatalogView =>
  CATALOG_VIEWS.some((view) => view === value);

/**
 * Runs before first paint (root layout): puts CATALOG_LIST_CLASS on <html> when the list view is stored, so a catalog
 * opened in the list view never flashes the grid first. The catalog grid and the cards read that class
 * with arbitrary variants (`[.catalog-list-view_&]:…`), not a `@custom-variant`: the dev server caches those.
 */
export const CATALOG_VIEW_INIT_SCRIPT = `(function(){try{if(localStorage.getItem("${CATALOG_VIEW_KEY}")==="list")document.documentElement.classList.add("${CATALOG_LIST_CLASS}")}catch(e){}})()`;
