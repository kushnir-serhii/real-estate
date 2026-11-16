import { useSyncExternalStore } from "react";

import { CATALOG_LIST_CLASS, CATALOG_VIEW_KEY, DEFAULT_CATALOG_VIEW as DEFAULT_VIEW, isCatalogView, type CatalogView } from "./catalog-view";

const VIEW_EVENT = "diplomat-hall-catalog-view-change";

const getView = (): CatalogView =>
  document.documentElement.classList.contains(CATALOG_LIST_CLASS) ? "list" : DEFAULT_VIEW;

const applyView = (view: CatalogView) => {
  document.documentElement.classList.toggle(CATALOG_LIST_CLASS, view === "list");
};

// Another tab changed the view.
const onStorage = (event: StorageEvent) => {
  if (event.key !== null && event.key !== CATALOG_VIEW_KEY) return;
  applyView(isCatalogView(event.newValue) ? event.newValue : DEFAULT_VIEW);
  window.dispatchEvent(new Event(VIEW_EVENT));
};

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onStorage);
  window.addEventListener(VIEW_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(VIEW_EVENT, onChange);
  };
};

/** The current view; `grid` on the server and during hydration. */
export const useCatalogView = (): CatalogView => useSyncExternalStore(subscribe, getView, () => DEFAULT_VIEW);

export const setCatalogView = (view: CatalogView) => {
  try {
    localStorage.setItem(CATALOG_VIEW_KEY, view);
  } catch {
    // storage unavailable (private mode): the choice lasts until reload
  }
  applyView(view);
  window.dispatchEvent(new Event(VIEW_EVENT));
};
