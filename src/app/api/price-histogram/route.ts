import { NextResponse } from "next/server";

import { parseHistogramParams, toPropertyFilters } from "@/features/catalog/catalog-params";
import type { SearchParams } from "@/features/catalog/catalog-params";
import { getPriceHistogram } from "@/lib/db/properties";
import { HISTOGRAM_DEFAULT_DEAL } from "@/lib/db/property-histogram-values";
import type { PriceHistogramResponse } from "@/lib/db/property-histogram-values";
import { getExchangeRates } from "@/lib/db/settings";

/** Same freshness as the home page and the property reads (the data is also cached under the `properties` tag). */
const CACHE_CONTROL = "public, max-age=60, s-maxage=300, stale-while-revalidate=600";

const toSearchParams = (url: URL): SearchParams => {
  const params: SearchParams = {};
  for (const key of new Set(url.searchParams.keys())) {
    const all = url.searchParams.getAll(key);
    params[key] = all.length === 1 ? all[0] : all;
  }
  return params;
};

/**
 * Price histogram for the price-range filter. Query: the `/catalog` filters (`deal`, `property_type`, `prop_kind`,
 * `rooms`, `district`, `area_from`, `area_to`; price params and `sort` / `page` are ignored). No deal means sale.
 * The body is in USD plus the exchange rates, so the client converts bins and fields to UAH / USD / EUR itself
 * (one cached response serves all three currencies). A bad value is a 400.
 */
export const GET = async (request: Request) => {
  const parsed = parseHistogramParams(toSearchParams(new URL(request.url)));
  if (!parsed.ok) return NextResponse.json({ error: "invalid params" }, { status: 400 });

  try {
    const rates = await getExchangeRates();
    const filters = toPropertyFilters(parsed.state, rates);
    const histogram = await getPriceHistogram(filters);
    const body: PriceHistogramResponse = { deal: filters.deal ?? HISTOGRAM_DEFAULT_DEAL, histogram, rates };
    return NextResponse.json(body, { headers: { "Cache-Control": CACHE_CONTROL } });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
};
