"use client";

import { useEffect, useState } from "react";
import type { RefObject } from "react";

/** The filters that shape the histogram; price, currency, sort and page never do. */
const CONTEXT_KEYS = ["deal", "property_type", "prop_kind", "rooms", "district", "area_from", "area_to"] as const;

const contextQuery = (data: FormData): string => {
  const query = new URLSearchParams();
  for (const key of CONTEXT_KEYS) {
    for (const value of data.getAll(key)) if (typeof value === "string" && value !== "") query.append(key, value);
  }
  return query.toString();
};

/**
 * Query string of the other filters in the form around `rootRef` (stable key order, so it doubles as a cache key),
 * kept live while the visitor changes them. `null` until the first read after mount.
 */
export const useHistogramContext = (rootRef: RefObject<HTMLElement | null>): string | null => {
  const [query, setQuery] = useState<string | null>(null);

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const read = () => setQuery(contextQuery(new FormData(form)));
    // Deferred: the custom selects update their hidden inputs a moment after the change event.
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(read, 0);
    };
    schedule();
    form.addEventListener("change", schedule);
    form.addEventListener("input", schedule);
    return () => {
      clearTimeout(timer);
      form.removeEventListener("change", schedule);
      form.removeEventListener("input", schedule);
    };
  }, [rootRef]);

  return query;
};
