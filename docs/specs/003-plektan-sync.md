# 003 — Plektan sync

**Status:** in-progress · **Depends on:** 002 · **Route(s):** `/api/cron/revalidate`

## Goal
The agency keeps working only in Plektan: its properties appear on the site within the sync interval, with photos copied to R2 as WebP, approximate coordinates and parsed prices; properties that vanish from Plektan get hidden. The site keeps everything (Supabase + R2), so it survives Plektan being switched off.

## Scope
- In: Plektan client + fixtures, mapping, full and incremental sync as a Node script run by GitHub Actions, hide vanished, agents, photos to R2 (WebP, 3 sizes), geocoding (Nominatim), cache revalidation endpoint, hiding `raw` / `house` from the public.
- Out: leads to Plektan (006), admin editing and the admin photo upload (008 — same output format: WebP 480/960/1600 under the same key layout, resized in the browser since Workers can't run `sharp`), the map itself (005).

## Data
`properties`, `property_photos`, `agents`, `settings.properties_source / last_sync_at / sync_cursor / exchange_rates`. Reference: [../reference/plektan-api.md](../reference/plektan-api.md).

How it runs:
- `pnpm sync` (incremental) and `pnpm sync --full` run `scripts/sync.ts` in Node (`tsx`, `--conditions=react-server` so `server-only` modules load). It does data, geocoding and photos in one pass, then POSTs the changed cache tags to `/api/cron/revalidate` on the site (`Authorization: Bearer $CRON_SECRET`), which calls `revalidateTag`.
- `.github/workflows/sync.yml`: incremental every 30 min 07:00–22:00 Kyiv time, full nightly at 03:00 Kyiv, plus manual `workflow_dispatch`. Secrets come from GitHub repo secrets (listed in [../setup.md](../setup.md)).
- Plektan `search` requires `deal`, `property`, `prop_kind[]` and a geography: a full sync is 3 deals × 4 types, every page (`rowsPerPage` 20), scoped by `geo_search_by=region` + `PLEKTAN_COUNTRY_ID` / `PLEKTAN_REGION_ID` / `PLEKTAN_LOCALITY_ID` from env (filled once the key exists). Incremental adds `after_date` = `settings.sync_cursor`. New or changed items (by `date_mod`) get a `view` call for description, all photos, `housestr`, `users`.
- Everything runs on fixtures when keys are empty: Plektan (`PLEKTAN_API_KEY`), R2 (`R2_*` → writes files to git-ignored `public/r2-local/`, so `photoUrl()` serves them locally), geocoder (`GEOCODER_CONTACT_EMAIL`).

## Slices

### [x] 1. Plektan client
- **Build:** `src/lib/plektan/` — `search` (one page, ≤20 rows, typed params incl. arrays like `prop_kind[]`), `searchAll` (iterates pages), `view`, `getContactPersons`, `getDistricts`. `POST https://re.plektan.com/uk/<section>/<command>`, `x-auth-token`, `version=1.1`; zod schemas for every response (lenient: unknown fields pass through into `raw`); timeout + retry with backoff on network/5xx. Fixture mode when `PLEKTAN_API_KEY` is empty: recorded-shape responses in `src/lib/plektan/fixtures/` — two snapshots (`base` and `next`: in `next` one property is gone, one changed price, one added) selected by `PLEKTAN_FIXTURE_SET`; ~12 properties covering all 4 types, 3 deals, 3 currencies, one `is_mls`, one without photos, varied price texts (`&asymp;`, spaces, `грн`, `$`, `€`, per m²). Dev tooling: `vitest` (`pnpm test`) and `tsx`.
- **Files:** `src/lib/plektan/*`, `src/lib/plektan/fixtures/*`, `package.json`, `vitest.config.ts`
- **Agent:** backend
- **Accept:**
  - [x] runs fully on fixtures without a key (`pnpm test` covers search pagination, view, contact persons)
  - [x] invalid response shape → typed error, not a crash with `undefined`

### [x] 2. Mapping
- **Build:** pure functions in `src/lib/sync/`: Plektan item (+ `view`) → `properties` insert/update row: price text parsing (HTML entities like `&asymp;`, spaces, currency sign/word → `price_amount` + `currency`; `price_per_m2`), `price_usd` from `settings.exchange_rates`, enums and the Plektan text lists, areas/rooms/storeys, address (`locality`, `district`, `street`, `house` = `housestr`), description = `promo_text` as plain text, generated Ukrainian title («2-кімнатна квартира, Оболонь», «Будинок 240 м², Козин», «Ділянка 12 сот., Ірпінь», «Офіс 85 м², Печерськ» — commercial label from `prop_kind`), slug = transliterated title + 6-char suffix (only for new rows; never changed), `source_updated_at` from `date_mod`, `raw` = original payload. `is_mls` and non-`actual` → skipped.
- **Files:** `src/lib/sync/map-property.ts`, `src/lib/sync/parse-price.ts`, `src/lib/sync/property-title.ts`, `src/lib/sync/slugify.ts`, `*.test.ts`
- **Agent:** backend
- **Accept:**
  - [x] tests cover every price format in the fixtures, plus empty / "договірна" → no price
  - [x] tests cover titles for all 4 types and slug transliteration

### [x] 3. Sync job
- **Build:** `src/lib/sync/run-sync.ts` (`full` | `incremental`): skips (logs, exits 0) unless `settings.properties_source = 'plektan'`; agents from `getContactPersons` (upsert by `external_id`, missing → `is_active = false`); properties upsert by (`source`, `external_id`) only when `date_mod` or mapped values changed; new → `published` + `published_at`; a hidden one that reappears → `published` again, same slug; full sync hides `plektan` properties missing from the result; writes `last_sync_at` and `sync_cursor` (Plektan format `YYYY-MM-DD HH:MM`, Kyiv time, a few minutes of overlap). Returns a summary (added / updated / hidden / unchanged) and the cache tags to revalidate. `scripts/sync.ts` entry + `pnpm sync`. `/api/cron/revalidate` route (zod body `{ tags: string[] }`, `CRON_SECRET` bearer, constant-time compare). `.github/workflows/sync.yml`. Migration: public (`anon`, `authenticated`) can no longer read `properties.raw` or `properties.house` (column privileges); `getPublishedProperties` / `getPropertyBySlug` stop selecting them; types regenerated. `setup.md`: GitHub secrets, env vars, the migration.
- **Files:** `src/lib/sync/run-sync.ts`, `scripts/sync.ts`, `src/app/api/cron/revalidate/route.ts`, `.github/workflows/sync.yml`, `supabase/migrations/*_hide_private_property_columns.sql`, `src/lib/db/properties.ts`, `src/lib/supabase/database.types.ts`, `.env.example`, `docs/setup.md`
- **Agent:** backend
- **Accept:**
  - [x] on local Supabase: full sync of `base`, then full sync of `next` → the removed property becomes `hidden`, the changed price is updated, the new one is published
  - [x] a second run with no changes writes nothing (summary all unchanged, no `updated_at` changes)
  - [x] with `properties_source = 'admin'` the sync writes nothing
  - [x] anon key can't read `raw` or `house`; the site's pages still render
  - [x] `/api/cron/revalidate` without / with a wrong secret → 401

### [ ] 4. Photos to R2
- **Build:** `src/lib/r2/` (`@aws-sdk/client-s3` against R2; fixture mode writes to `public/r2-local/`, git-ignored). In the sync: download each new photo (fixture mode: Plektan fixture URLs resolve to files in `public/placeholders/`), `sharp` → WebP at 480 / 960 / 1600 px wide (never upscaled), keys `properties/<property_id>/<hash>-<w>.webp`; `property_photos` rows ordered as in Plektan, `r2_key` = 960 version, `sizes` = `{ "480": key, "960": key, "1600": key }`, `width`/`height` of the largest, `source_url` = Plektan URL. A photo whose `source_url` is already stored is skipped; photos removed in Plektan are deleted (row + R2 objects). Agent photos (`url_small`) copied once into `agents/<id>.webp`. A failed photo is logged and retried next run; it never fails the sync.
- **Files:** `src/lib/r2/*`, `src/lib/sync/sync-photos.ts`, `src/lib/sync/run-sync.ts`, `.gitignore`
- **Agent:** backend
- **Accept:**
  - [ ] re-sync doesn't re-download or re-upload existing photos
  - [ ] removing a photo from the fixture removes its row and R2 objects
  - [ ] locally (fixture mode) synced properties show their photos on the site

### [ ] 5. Geocoding
- **Build:** `src/lib/geocode/` — Nominatim (`https://nominatim.openstreetmap.org/search`, `countrycodes=ua`, `accept-language=uk`, User-Agent with `GEOCODER_CONTACT_EMAIL`, ≤1 request/s, timeout). Query from locality, district, street, `housestr`; falls back to street level, then district. Result rounded to 3 decimals (~100 m) before saving — the site shows an approximate area. Called only when the address changed or `lat/lng` are empty. Fixture mode when `GEOCODER_CONTACT_EMAIL` is empty (deterministic coords near the locality).
- **Files:** `src/lib/geocode/*`, `src/lib/sync/run-sync.ts`
- **Agent:** backend
- **Accept:**
  - [ ] fixture mode; failures leave `lat/lng` empty, sync continues
  - [ ] unchanged address → no geocoder call on re-sync

## External needs
- Plektan API key (from the agency) and a test account; then `PLEKTAN_COUNTRY_ID` / `PLEKTAN_REGION_ID` / `PLEKTAN_LOCALITY_ID` for the agency's area.
- R2 bucket + S3 API keys + public URL on the client's Cloudflare.
- GitHub repo secrets for the sync workflow (see [../setup.md](../setup.md)).
- An email for Nominatim's User-Agent (usage policy).

## Open questions
- Does `search` return only the agency's own base (not the owner listings Plektan scrapes from portals)? Checked once the key exists. `is_mls` is filtered either way.
- **Decided 2026-10-28:** the sync is a Node script run by GitHub Actions (data + geocoding + photos with `sharp`), then calls `/api/cron/revalidate`. Not a Worker: no `sharp` there, and per-request subrequest limits. New dev deps: `tsx`, `sharp`, `vitest`.
- **Decided 2026-10-28:** incremental every 30 min 07:00–22:00 Kyiv, full nightly (~1000 Actions minutes a month; fits the 2000 free on a private repo).
- **Decided 2026-10-28:** geocoder Nominatim (OSM, free, no key), swappable behind `src/lib/geocode/`.
- **Decided 2026-10-28:** approximate location — coordinates rounded to ~100 m; `raw` and `house` not readable by the public.
- **Decided 2026-10-28:** titles generated in Ukrainian; description = `promo_text`; new properties published immediately; `price_usd` from `settings.exchange_rates`; agents from `getContactPersons`; photos WebP 480/960/1600; tests with vitest.

- A change of `settings.exchange_rates` doesn't re-price existing Plektan rows until their `date_mod` changes. Fine while Plektan mode has no rate editing; revisit with 008.
- In Plektan mode the sync owns properties: a hand-hidden property is re-published on the next sync. 008 should make Plektan properties read-only in the admin (one source of truth).

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-28 | 1 | done | `src/lib/plektan/` (`client.ts`, `schemas.ts`, `errors.ts`, `encode-form.ts`, `index.ts`, `fixtures/{data,transport}.ts`, `client.test.ts` — 27 tests), `vitest.config.ts`, `tsx` + `vitest` dev deps, `pnpm test`, `.env.example`. Fixtures: `base` 12 properties (adid 1001–1012), `next` drops 1002, changes 1001's price, adds 1013; agents 501–503. Unverified until the key exists: form-encoded body, 1-based `currentPage`, `view`/`getContactPersons`/`getDistricts` envelopes, `price.kind` / `currency_id` codes (mapping relies on the price text). |
| 2026-10-28 | 2 | done | `src/lib/sync/{map-property,parse-price,property-title,slugify,html-text}.ts` + tests (89 total). `mapProperty(item, view, rates)` → skip (`mls` / `not_actual` / `unsupported`) or row + `agentExternalId`. Per-m² headline price × `area_total` (no area → no price); earliest currency in the text wins; `date_mod` read as Kyiv local time (unverified); unknown Plektan list values → null (original in `raw`). `apartments` titled «N-кімнатна квартира». |
| 2026-10-28 | 3 | done | `src/lib/sync/{run-sync,sync-cursor}.ts`, `scripts/{sync,check-sync}.ts` (`pnpm sync [--full --no-revalidate --force-hide]`, `pnpm sync:check` — local only, 22 checks, ran 6× green), `src/app/api/cron/revalidate/route.ts` (bearer `CRON_SECRET`, `revalidateTag(tag, { expire: 0 })`), `.github/workflows/sync.yml` (skips without `PLEKTAN_API_KEY`), migration `20261028140000_hide_private_property_columns.sql` (column grants; anon `raw`/`house` → 401), `PROP_KINDS_BY_PROPERTY`, `properties.ts` drops `house`, `setup.md` (secrets, first run). Safety guard: a full sync won't hide when the result is empty or < half of published Plektan rows remain. A failed item → `failed`, exit 1, cursor not advanced. Workflow not run (can't locally). |
