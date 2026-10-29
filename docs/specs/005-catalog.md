# 005 — Catalog + property page

**Status:** done · **Depends on:** 002, 004 · **Route(s):** `/catalog`, `/catalog/[slug]`, `/favorites`

## Goal
Visitors (mostly on phones) find a property with filters, open its page with a good gallery, facts and an approximate location, save favorites, and reach the agent or agency in one tap. A property that was just sold keeps a "sold" page for a week instead of a dead link.

## Scope
- In: catalog with filters in the URL, sort, pagination; property card; property page (gallery, facts, description, approximate location map, agent, contact CTA, similar); "sold" page for 7 days after a property is hidden, then a custom 404; favorites in localStorage.
- Out: request form and its logic (006 — the CTA leads to a "call or message us" block until then), SEO templates and landing URLs (009; basic metadata and canonical here), catalog map view.

## Data
`getPublishedProperties`, `getPropertyBySlug`, `property_photos`, `agents`, `settings.exchange_rates`; seed data from 002. New: `properties.hidden_at` (slice 3).

- URLs: query params on `/catalog` — `deal`, `property_type`, `prop_kind`, `rooms`, `price_from` / `price_to` + `currency` (as the home quick search in 004 builds them; converted to `price_usd_*` with `settings.exchange_rates`), `area_from` / `area_to`, `district`, `sort`, `page`. Unknown/invalid values are ignored, never an error page.
- Exchange rates for the public pages: a cached server-only read (tag `settings`), not exposed to the browser beyond what's needed.
- Prices on cards and pages: in the property's own currency (`formatPrice`).

## Slices

### [x] 1. Catalog list + card
- **Build:** `/catalog` page: title by filters («Продаж квартир», «Оренда», «Усі об'єкти»), result count, filters as a plain GET form (works without JS): deal, type, kind (only when a type is chosen), rooms (1–4, 5+), price from/to + currency (USD default), area from/to, district (options = districts of published properties, cached); desktop: sidebar; mobile: «Фільтри (N)» button opening a sheet with «Показати» and «Скинути». Sort select (newest, price ↑↓, area ↑↓) applies on change (tiny client enhancement; without JS a button). Numbered pagination (12 per page) keeping the filters. Card extended from 004 (photo, price, title, facts, deal/type badge) — reused by home. `loading.tsx` skeleton grid, `error.tsx` with retry. Data cached by tag; `generateMetadata` (title by filters, canonical `/catalog` without params).
- **Files:** `src/app/(site)/catalog/{page,loading,error}.tsx`, `src/features/catalog/*`, `src/features/properties/property-card.tsx`, `src/lib/db/{properties,settings}.ts` (cached rates, districts)
- **Agent:** designer
- **Accept:**
  - [x] reload keeps filters; back button works
  - [x] empty result explains and offers to reset filters
  - [x] the home quick search URL (`deal`, `property_type`, `rooms`, `price_to`, `currency`) lands on correctly filtered results
  - [x] 375px: filters in a sheet, no horizontal scroll, 44px targets

### [x] 2. Property page
- **Build:** `/catalog/[slug]`: gallery (CSS scroll-snap, swipe, arrow buttons + keyboard ←/→, counter, fullscreen view in a dialog, explicit sizes from `width`/`height`, `srcset` from `sizes`, first photo eager, rest lazy; «Фото незабаром» placeholder), price (+ per m² when present), key facts (rooms, areas, floor/floors, kind, repair, wall material, class, new build — Ukrainian labels), description (plain text with paragraphs), location text (locality, district, street — no house number), contact card: the property's agent (name, photo or avatar, phone `tel:`) or the agency when there's none, plus agency Telegram/Viber; CTA «Залишити заявку» → the contact block (006 replaces with the form); sticky bottom bar on mobile (call + CTA). Similar: same deal + type, price ±30% (`price_usd`), up to 4, excluding itself. `generateMetadata` (title, description from the text, canonical, first photo as OG image). `loading.tsx`, `error.tsx`.
- **Files:** `src/app/(site)/catalog/[slug]/{page,loading,error}.tsx`, `src/features/property/*`, `src/lib/db/properties.ts` (`getSimilarProperties`)
- **Agent:** designer
- **Accept:**
  - [x] no layout shift on images; missing photos handled
  - [x] gallery works with swipe, keyboard and in fullscreen; focus returns on close
  - [x] property without agent shows the agency contact; long title/description wrap

### [x] 3. Sold page + custom 404
- **Build:** migration: `properties.hidden_at timestamptz` + trigger (set to `now()` when `status` becomes `hidden`, cleared when it becomes `published`; backfill existing hidden rows with `updated_at`); RLS: the public may also read properties (and their photos) hidden less than 7 days ago; column grant for `hidden_at`; types regenerated. `getPublishedProperties` / similar keep filtering `status = 'published'`. `getPropertyBySlug` returns published or recently hidden. Page: hidden ≤ 7 days → a "sold" design: status banner «Продано» (sell) / «Вже здано» (rents), the first photo muted, title, last price struck through or labelled, short facts, no contact-for-this-property CTA but «Підберемо схожий» → contact block, similar properties; `robots: noindex`; page revalidates at most hourly so the 7-day limit is honored. After 7 days or unknown slug → custom 404 for the property segment: «Цей об'єкт уже продано або знято з продажу», newest properties, links to the catalog and contacts (HTTP 404).
- **Files:** `supabase/migrations/*_property_hidden_at.sql`, `src/lib/supabase/database.types.ts`, `src/lib/db/properties.ts`, `src/app/(site)/catalog/[slug]/{page,not-found}.tsx`, `src/features/property/sold-*.tsx`, `docs/setup.md`
- **Agent:** backend (migration, data) then designer (pages)
- **Accept:**
  - [x] a property hidden today shows the sold page (noindex); hidden 8 days ago → 404 page; unknown slug → 404 page
  - [x] anon can read a property hidden 3 days ago but not one hidden 8 days ago (checked locally); catalog and similar never show hidden ones
  - [x] re-publishing clears `hidden_at`

### [x] 4. Map
- **Build:** `leaflet` (no react-leaflet), loaded only when the location block scrolls into view (dynamic import), OSM tiles, a ~300 m circle around the rounded `lat/lng` (not a pin), «© OpenStreetMap contributors» attribution, zoom controls, no scroll-zoom hijack on mobile; no map when coordinates are empty (the address text stays). Fixed-height box so nothing shifts.
- **Files:** `src/features/property/property-map*.tsx`, `package.json`
- **Agent:** designer
- **Accept:**
  - [x] map loads lazily, doesn't block LCP; no layout shift
  - [x] property without coordinates shows no map and no error

### [x] 5. Favorites
- **Build:** heart button on card and page (`aria-pressed`, label), list of property ids in localStorage with try/catch (storage blocked → the heart still toggles for the session, no crash); `/favorites` page loads the saved ones from the server (published or recently sold; others shown as «Більше недоступний» with «Прибрати»), empty state with a link to the catalog; header shows a favorites link with a count.
- **Files:** `src/features/favorites/*`, `src/app/(site)/favorites/page.tsx`, `src/app/api/favorites/route.ts` (or a server action), `src/components/layout/*`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [x] works with storage blocked (no crash)
  - [x] removed/unknown ids don't break the page

## External needs
- None to build. OSM tiles are used under the OSM tile usage policy (fine for this traffic; switch to a tile provider like MapTiler if traffic grows — needs a key then).
- From 003: property `lat`/`lng` are rounded to ~100 m (show an approximate area, not a pin; `house` isn't public). Coordinates come from OpenStreetMap (Nominatim): show "© OpenStreetMap contributors" with the map.
- Slice 3 adds a migration to apply (listed in [../setup.md](../setup.md)).

## Open questions
- **Decided 2026-10-28:** query-param URLs on `/catalog` now; landing URLs (`/prodazh/kvartyry/…`) in 009.
- **Decided 2026-10-28:** a hidden (sold/removed) property keeps a designed "sold" page for 7 days after it was hidden, then a custom 404 with newest properties.
- **Decided 2026-10-28:** map with Leaflet + OSM tiles, a ~300 m circle (approximate), lazy; no catalog map view now.
- **Decided 2026-10-28:** contact = the property's agent when present, else the agency; agency messengers always.
- **Decided 2026-10-28:** GET filter form (works without JS), sheet on mobile; price filter in a chosen currency (USD default) converted with `settings.exchange_rates`; cards in the property's own currency; districts from published properties; numbered pagination; gallery without a library; similar = same deal + type, ±30% price, up to 4; CTA → contact block until 006; favorites on the device.
- Plektan doesn't say why a property vanished (sold, deferred, withdrawn): the sold page says «Продано» / «Вже здано» for every hidden property.
- Without JS at all the catalog shows the streaming skeleton (the `(site)` `loading.tsx`); the GET form itself works before JS loads. Kept on purpose: streaming skeleton > blocking page; crawlers render JS.
- Indexing (for 009): plain `/catalog` and `/catalog?deal=X` are indexed (canonical = themselves); any other params → `noindex, follow`, canonical `/catalog`.
- `getPublishedDistricts` dedupes in code and is capped by PostgREST's 1000 rows: needs a view/RPC above ~1000 published properties.
- Header «Купити» / «Орендувати» are never highlighted (reading the query in the shared header would make static pages dynamic).
- Price per m² shown for sales and long rent («за м² / міс»), not for daily rent.
- An inactive agent isn't readable by the public (RLS), so its properties show the agency contact — no extra logic needed.
- Wall material labels for the agency to check: `poroterm` → «Керамоблок», `monolit_carcas` → «Монолітно-каркасний».
- RLS now lets properties hidden < 7 days through: every public list/count read must filter `status = 'published'` explicitly (all current ones do).
- When the migration is applied in production, existing hidden rows get `hidden_at = updated_at`, so those hidden more than 7 days ago are 404 right away (expected).
- The property 404's content is streamed (inside the `(site)` loading boundary): correct 404 status and title, but the heading isn't in the initial HTML. Same trade-off as the catalog.
- No heart on the sold page (a saved sold property still shows on `/favorites` with its badge).

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-28 | 1 | done | `/catalog` (`page`, `loading`, `error`), `src/features/catalog/*` (params parsing + tests, filters form in sidebar / mobile sheet, sort on change, pagination, empty / out-of-range states, skeleton), `property-card.tsx` (article + stretched link, `srcset` from `sizes`, plots in сот.), `property-labels.ts` (all `prop_kind` labels), `getExchangeRates()` (cached, tag `settings`, falls back to default rates), `getPublishedDistricts()`, out-of-range page → empty page with the real total. Empty-param URLs redirect to a clean URL (replace). Rooms/area hidden for plots. UI check: catalog, filtered, quick-search URL, root — pass; screenshots reviewed. |
| 2026-10-28 | 2 | done | `/catalog/[slug]` (`page`, `loading`, `error`; on-demand ISR, unknown slug → 404), `src/features/property/*` (gallery: scroll-snap, ←/→, swipe, counter, fullscreen Radix Dialog with focus return, CLS 0; facts `<dl>`, price + per m², description paragraphs, location text with a map slot, contact card agent / agency + messengers, mobile sticky call + request bar, similar ±30% `price_usd`), `getSimilarProperties`, `photo-src-set.ts`, `to-tel.ts`, labels for repair / walls / class, `--viewer` token + `scrollbar-none`. `generateMetadata`: SEO title or title, description fallback, canonical, OG = widest first photo. UI check on 3 slugs 12/12; screenshots reviewed. |
| 2026-10-28 | 3 | done | Migration `20261028150000_property_hidden_at.sql` (`hidden_at` + trigger, backfill without bumping `updated_at`, RLS for properties + photos: published or hidden < 7 days, column grant, partial index). `getPropertyBySlug` → `{kind: 'published' \| 'sold', property} \| null` (window re-checked in code, `revalidate: 3600`), `SOLD_PAGE_DAYS`. Pages: `sold-property-view` («Продано» / «Вже здано», muted photo, «Остання ціна», short facts, agency «Підберемо схожий», similar, noindex), segment `not-found.tsx` (newest 3, buttons to catalog / contacts), route `revalidate = 3600`. Prod build: sold → 200 + noindex, 8 days → 404, unknown → 404. Local anon: 3 days visible (+ photos), 8 days not; catalog shows 28 of 30 anon-visible. UI check 12/12; screenshots reviewed. |
| 2026-10-28 | 4 | done | `leaflet` 1.9 (+ `@types/leaflet`), `property-map.tsx` (fixed ratio box, IntersectionObserver 200px → dynamic import, loading / error + retry states), `property-map-leaflet.ts` (lazy chunk: OSM tiles, 300 m accent circle fitted to view, no wheel zoom, one-finger drag off on touch, 44px zoom buttons in tokens, cleanup), `property-map.css` (leaflet CSS in the `base` layer, only in the lazy chunk), `property-location.tsx` (map + «приблизний район» caption + OSM link without a pin). Checked: 0 leaflet/tile requests before scroll, CLS 0; no coords → no map, no errors. Seed: one published plot without coords. UI check 8/8; screenshots reviewed. |
| 2026-10-28 | 5 | done | `src/features/favorites/*` (`useSyncExternalStore` store over `sofiacity:favorites`, zod per id, cap 100, in-memory fallback, tab sync; heart button 44px with `aria-pressed` + status announcement; list / empty / unavailable / error + retry), `/favorites` (noindex), `POST /api/favorites` (zod ≤100 uuids → `getPropertiesByIds`, published or hidden < 7 days, saved order), heart on cards and next to the price, header favorites link with a count badge (desktop + mobile header). Checked: storage throwing → toggles work, no errors; unknown / junk ids → «Більше недоступний» + «Прибрати». |
| 2026-10-28 | — | UI check | `root`, `catalog`, filtered, empty result, 3 property pages (photos / no agent / sold), unknown slug, `favorites`: 36/36 pass; screenshots reviewed. Spec done. |
