"use client";

import { useEffect, useState } from "react";

import type { PriceHistogramResponse } from "@/lib/db/property-histogram-values";

const DEBOUNCE_MS = 250;

/** Responses per query string, for the lifetime of the page. */
const cache = new Map<string, PriceHistogramResponse>();

type Loaded = { query: string; outcome: "error" | PriceHistogramResponse };

export type PriceHistogramState = {
  /** The response for `query`, or the previous one while a new query loads (so the chart does not flash). */
  data: PriceHistogramResponse | null;
  status: "loading" | "ready" | "error";
  retry: () => void;
};

/** Loads `/api/price-histogram?<query>`: debounced, the previous request is aborted, answers are cached. */
/** `query === null`: nothing to load (idle). */
export const usePriceHistogram = (query: string | null): PriceHistogramState => {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [last, setLast] = useState<PriceHistogramResponse | null>(null);

  useEffect(() => {
    if (query === null || cache.has(query)) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/price-histogram${query ? `?${query}` : ""}`, { signal: controller.signal });
        if (!response.ok) throw new Error(String(response.status));
        // Our own route; its body is typed by `PriceHistogramResponse`.
        const data = (await response.json()) as PriceHistogramResponse;
        cache.set(query, data);
        setLast(data);
        setLoaded({ query, outcome: data });
      } catch {
        if (!controller.signal.aborted) setLoaded({ query, outcome: "error" });
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, attempt]);

  const retry = () => {
    setLoaded(null);
    setAttempt((n) => n + 1);
  };

  const cached = query === null ? undefined : cache.get(query);
  if (cached) return { data: cached, status: "ready", retry };
  const failed = loaded?.query === query && loaded.outcome === "error";
  return { data: last, status: failed ? "error" : "loading", retry };
};
