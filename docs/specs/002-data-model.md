# 002 — Data model (Supabase)

**Status:** draft · **Depends on:** 001 · **Route(s):** —

## Goal
The tables everything else reads and writes — properties, photos, leads, pages, settings — with RLS, generated types and seed data, so the site works without Plektan.

## Scope
- In: migrations, RLS, generated types, data-access functions, seed/fixtures, the "source of truth" setting.
- Out: sync logic (003), admin UI (007/008).

## Data
- `properties`: `id uuid`, `source` (`plektan` | `admin`), `external_id` (Plektan `adid`, unique per source), `status` (`published` | `hidden`), `deal` (`sell` | `rent_long` | `rent_day`), `property` (`flat` | `house` | `commercial` | `plot`), `prop_kind`, `price_amount`, `currency`, `price_per_m2`, `area_total/life/kitchen/lot`, `room_count`, `storey`, `storeys`, `repair`, `wall_material`, `housing_class`, `is_newbuilding`, `locality`, `district`, `street`, `house`, `lat`, `lng`, `title`, `description`, `slug` (unique), `seo_title`, `seo_description`, `agent` (jsonb or FK), `raw jsonb`, `source_updated_at`, `synced_at`, timestamps.
- `property_photos`: `property_id`, `position`, `r2_key`, `width`, `height`, `sizes jsonb`, `source_url`.
- `leads`: `id`, `kind` (`property_request` | `general` | `ai`), `property_id?`, `name`, `phone`, `email?`, `message`, `payload jsonb` (structured AI data), `consent_at`, `plektan_status/error/attempts/item_id`, `telegram_status/error/attempts`, timestamps.
- `pages`: `slug`, `title`, `body`, `seo_title`, `seo_description`.
- `settings`: single row — `properties_source` (`plektan` | `admin`), `last_sync_at`, `sync_cursor`.
- `src/lib/db/*.ts`: read functions for the site, write functions for server code.

## Slices

### [ ] 1. Properties + photos
- **Build:** migration, enums as check constraints or Postgres enums, indexes for catalog filters, RLS (public reads only `published`), types regenerated, `getPublishedProperties(filters, page)`, `getPropertyBySlug`.
- **Agent:** backend
- **Accept:**
  - [ ] anon key can't read hidden properties or write anything
  - [ ] types regenerated; typecheck/lint/build green

### [ ] 2. Leads, pages, settings
- **Build:** migrations + RLS (no public read on leads; inserts only via server code), `createLead`, `getPage`, `getSettings`.
- **Agent:** backend
- **Accept:**
  - [ ] anon key can't read leads
  - [ ] `settings` has exactly one row

### [ ] 3. Seed
- **Build:** `supabase/seed.sql` (or a script) with ~30 realistic properties (all 4 types, both currencies, missing photos, long titles) and photos from placeholders, so 004/005 can be built before Plektan.
- **Model:** haiku
- **Accept:**
  - [ ] `supabase db reset` locally gives a browsable dataset

## External needs
- The user applies migrations to the client's Supabase project.

## Open questions
- Agents: store a snapshot on the property (jsonb from `view.users`) or a separate `agents` table synced from `getContactPersons`? (Recommended: `agents` table — reused on the contacts page.)
- Price for rent: per month / per day — store a `price_period`?
- Do we need multilingual fields (uk + ru/en)? (Recommended: no, uk only.)

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
