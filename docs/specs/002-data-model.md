# 002 — Data model (Supabase)

**Status:** done · **Depends on:** 001 · **Route(s):** —

## Goal
The tables everything else reads and writes — properties, photos, agents, leads, pages, settings — with RLS, generated types and seed data, so the site works without Plektan. Every column later specs (003–010) need exists now, so they don't have to reshape applied migrations.

## Scope
- In: migrations, RLS, generated types, data-access functions, a cookie-less public Supabase client with tagged caching, `photoUrl()`, seed + placeholder photos, the "source of truth" setting.
- Out: sync logic and the WebP pipeline (003), admin role + admin read/write policies (007/008), "sold" page (005 — `hidden` covers it).

## Data
Small stable value sets are **Postgres enums** (exact unions in the generated types): `property_source` (`plektan` | `admin`), `property_status` (`published` | `hidden`), `deal` (`sell` | `rent_long` | `rent_day`), `property_type` (`flat` | `house` | `commercial` | `plot`), `currency` (`UAH` | `USD` | `EUR`), `lead_kind` (`property_request` | `general` | `ai`), `delivery_status` (`pending` | `sent` | `failed` | `skipped`). Plektan's long lists (`prop_kind`, `repair`, `wall_material`, `housing_class`) are plain `text`, validated with zod `as const` arrays in `src/lib/db/` (values from [../reference/plektan-api.md](../reference/plektan-api.md)), so a new Plektan value needs no migration.

- `agents`: `id uuid`, `source`, `external_id` (Plektan `user_id`, unique per source), `name`, `phones text[]`, `email`, `photo_url`, `is_active`, timestamps. Public reads active agents.
- `properties`: `id uuid`, `source`, `external_id` (Plektan `adid`, unique per source), `status`, `deal`, `property_type`, `prop_kind`, `price_amount bigint`, `currency`, `price_usd bigint` (normalized, for filtering/sorting across currencies), `price_per_m2 bigint`, `area_total/life/kitchen/lot numeric`, `room_count`, `storey`, `storeys`, `repair`, `wall_material`, `housing_class`, `is_newbuilding`, `locality`, `district`, `street`, `house`, `lat`, `lng`, `title`, `description`, `slug` (unique), `seo_title`, `seo_description`, `agent_id` (FK → `agents`, nullable), `raw jsonb`, `source_updated_at`, `synced_at`, `published_at`, timestamps. Rental period comes from `deal` (`rent_long` = per month, `rent_day` = per day); Plektan's price text and `price.kind` stay in `raw`.
- `property_photos`: `id`, `property_id`, `position`, `r2_key`, `width`, `height`, `sizes jsonb`, `source_url`. Public reads photos of published properties.
- `leads`: `id`, `kind`, `property_id?`, `name`, `phone`, `email?`, `message?`, `payload jsonb` (structured AI data), `consent_at`, `client_request_id uuid unique` (idempotency: double submit = one lead), `page_url`, `utm jsonb`, `plektan_status/error/attempts/item_id`, `telegram_status/error/attempts`, timestamps. No public access at all; written only by server code with the service-role client.
- `pages`: `slug`, `title`, `body` (Markdown), `seo_title`, `seo_description`, timestamps. Public read.
- `settings`: exactly one row (boolean primary key + check) — `properties_source` (`plektan` | `admin`), `last_sync_at`, `sync_cursor`, `exchange_rates jsonb` (UAH/EUR per 1 USD, set by the admin; used for `price_usd` in admin mode). No public read; server only.
- Slugs: Ukrainian title transliterated + short unique suffix (`2-kimnatna-kvartyra-sykhiv-a1b2c3`), generated once and never changed after publish.
- Clients and caching: `src/lib/supabase/public.ts` — anon key, no cookies, for public reads that must stay static. Read functions are wrapped in `unstable_cache` with tags `properties`, `property:<slug>`, `pages`, `agents` (tag names exported as constants) so 003/008/009 can `revalidateTag`.
- `src/lib/db/*.ts`: read functions for the site, write functions for server code.

## Slices

### [x] 1. Agents, properties, photos
- **Build:** migration with the enums above, `agents`, `properties`, `property_photos`; indexes for catalog filters (status + deal + property_type, price_usd, area_total, room_count, district, published_at) and `updated_at` triggers; RLS (anon/authenticated read only `published` properties, their photos, active agents; no writes). `src/lib/supabase/public.ts`. Types regenerated (`pnpm db:types`). `src/lib/db/properties.ts`: filters zod schema, `getPublishedProperties(filters, page)` (paginated, total count, sort by price/area/newest, photos + agent), `getPropertyBySlug(slug)`; cache tag constants. `src/lib/photos/photo-url.ts`: `photoUrl(key)` = `NEXT_PUBLIC_R2_PUBLIC_URL/key`, or `/key` (served from `public/`) when empty.
- **Files:** `supabase/migrations/*_properties.sql`, `src/lib/supabase/public.ts`, `src/lib/supabase/database.types.ts`, `src/lib/db/properties.ts`, `src/lib/db/cache-tags.ts`, `src/lib/photos/photo-url.ts`
- **Agent:** backend
- **Accept:**
  - [x] anon key can't read hidden properties (or their photos) or write anything
  - [x] types regenerated; typecheck/lint/build green

### [x] 2. Leads, pages, settings
- **Build:** migration + RLS (leads: RLS on, no policies for anon/authenticated; pages: public read; settings: no public access, single row enforced and inserted by the migration). `src/lib/db/leads.ts`: `createLead` (service role, server-only, idempotent on `client_request_id`); `src/lib/db/pages.ts`: `getPage(slug)` (cached, tag `pages`); `src/lib/db/settings.ts`: `getSettings()` (server-only). Types regenerated.
- **Files:** `supabase/migrations/*_leads_pages_settings.sql`, `src/lib/db/{leads,pages,settings}.ts`, `src/lib/supabase/database.types.ts`
- **Agent:** backend
- **Accept:**
  - [x] anon key can't read or insert leads, or read settings
  - [x] `settings` has exactly one row (a second insert fails)
  - [x] `createLead` called twice with the same `client_request_id` gives one lead

### [x] 3. Seed
- **Build:** `supabase/seed.sql` with ~30 realistic Kyiv properties (all 4 types, sale + both rents, UAH/USD/EUR, real Kyiv districts, several without photos, a few very long titles/descriptions, a couple `hidden`), 3 agents, pages `home`/`about`/`contacts`, settings exchange rates. ~10 free-to-use photos (Unsplash licence) downloaded once as WebP into `public/placeholders/`, referenced by `r2_key = placeholders/<file>.webp`.
- **Files:** `supabase/seed.sql`, `public/placeholders/*`
- **Agent:** backend (Sonnet — the Ukrainian copy needs quality)
- **Accept:**
  - [x] `supabase db reset` locally gives a browsable dataset; `getPublishedProperties` returns it
  - [x] placeholder photos are under ~200 KB each

## External needs
- The user applies migrations `20261028120000_properties.sql` and `20261028130000_leads_pages_settings.sql` to the client's Supabase project (`seed.sql` is local-only demo data, don't run it on production).

## Open questions
- **Decided 2026-10-28:** separate `agents` table (FK from properties), reused on the contacts page.
- **Decided 2026-10-28:** no `price_period` — derived from `deal`.
- **Decided 2026-10-28:** uk only, no multilingual fields.
- **Decided 2026-10-28:** normalized `price_usd` for cross-currency filters; rates in `settings.exchange_rates` for admin mode.
- **Decided 2026-10-28:** Postgres enums for small sets, `text` + zod for Plektan's long lists; column `property_type` (not `property`); prices `bigint`.
- **Decided 2026-10-28:** cookie-less `public.ts` client + `unstable_cache` tags for public reads.
- **Decided 2026-10-28:** leads written only via service role (no anon insert policy); admin read comes in 007. Extra columns `client_request_id`, `page_url`, `utm`.
- **Decided 2026-10-28:** `pages.body` is Markdown; `settings` single row, server only.
- **Decided 2026-10-28:** seed city Kyiv; local placeholder photos + `photoUrl()`; seed written by Sonnet.
- `exchange_rates` default (UAH 41.5, EUR 0.92 per USD) is a guess; the admin sets real rates (008). Until then `price_usd` in admin mode uses these.
- Agents in the seed have no `photo_url` (no portrait placeholders) — 005 shows the "no photo" avatar state. Placeholder photos are generic (a villa with a pool, glass office towers), not Kyiv-specific; fine for layout work.
- `createLead` doesn't check that `property_id` exists (an unknown id throws an FK error) — handle in 006.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-28 | 1 | done | Migration `20261028120000_properties.sql` (5 enums, `agents`, `properties`, `property_photos`, `set_updated_at()` trigger, catalog indexes, select-only RLS). RLS checked on local with the anon key: only the published property, its photo and the active agent are visible; insert → 42501, update/delete → 0 rows. `status` defaults to `hidden`. Filters take USD-normalized price bounds (caller converts). `src/lib/supabase/public.ts`, `src/lib/db/{properties,property-values,cache-tags}.ts`, `src/lib/photos/photo-url.ts`, `database.types.ts` |
| 2026-10-28 | 2 | done | Migration `20261028130000_leads_pages_settings.sql` (`lead_kind`, `delivery_status`; `leads` + `settings` RLS on, no policies, revoked from anon/authenticated; `pages` public read; settings row inserted, `id boolean check (id)`). Local checks: anon select/insert leads and select settings → 42501; second settings insert → 23505 / 23514; same `client_request_id` twice → one row, same id. Default rates UAH 41.5 / EUR 0.92 per USD. `src/lib/db/{leads,pages,settings,cache-tags}.ts`, `database.types.ts` |
| 2026-10-28 | 3 | done | `supabase/seed.sql`: 30 properties (flat 14, house 6, commercial 5, plot 5; sell 21, rent_long 6, rent_day 3; USD 14, UAH 13, EUR 2, 1 without price; 28 published, 2 hidden; 4 `plektan` with `raw`; 6 published without photos; 2 titles > 120 chars, long descriptions), 3 agents (1 inactive), pages `home`/`about`/`contacts`, rates. Plot `area_lot` in sotky. Anon REST with the `getPublishedProperties` shape: 12 items, total 28, no hidden. `public/placeholders/` — 11 Unsplash WebP photos, 80–176 KB, README with sources. Spec done. |
