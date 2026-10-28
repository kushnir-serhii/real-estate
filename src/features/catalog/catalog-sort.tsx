import Form from "next/form";

import { Button } from "@/components/ui/button";
import { catalogQuery } from "./catalog-params";
import type { CatalogState } from "./catalog-params";
import { SortSelect } from "./sort-select";

type CatalogSortProps = { state: CatalogState };

/** GET form that keeps the current filters (hidden fields) and resets to page 1. */
export const CatalogSort = ({ state }: CatalogSortProps) => {
  const kept = [...new URLSearchParams(catalogQuery({ ...state, sort: "newest", page: 1 }))];
  return (
    <Form action="/catalog" scroll={false} aria-label="Сортування" className="flex items-center gap-2">
      {kept.map(([name, value], i) => (
        <input key={`${name}-${i}`} type="hidden" name={name} value={value} />
      ))}
      <SortSelect value={state.sort} />
      <noscript>
        <Button type="submit" variant="outline">
          Застосувати
        </Button>
      </noscript>
    </Form>
  );
};
