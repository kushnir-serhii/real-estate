# 008 — Admin: properties + photos

**Status:** in-progress · **Depends on:** 003, 007 · **Route(s):** `/admin/settings`, `/admin/properties`, `/admin/properties/new`, `/admin/properties/[id]`

## Goal
The agency can run the catalog without the CRM: create, edit, publish and hide properties with photos stored in R2. Switching Plektan off never freezes the catalog. The longest part of the admin.

## Scope
- In: the source-of-truth switch and exchange rates (`/admin/settings`), properties list, create/edit form, publish/hide, delete of never-published drafts, SEO overrides per property, read-only mode for what the sync owns, photo upload (multiple, drag & drop, mobile camera) / reorder / cover / delete to R2.
- Out: bulk import from the old WordPress site (client decision, see Open questions); agent management in the admin; a map picker for coordinates; SEO templates (009).

## Data
- `properties`, `property_photos`, `agents` (read), `settings.properties_source`, `settings.exchange_rates`; `src/lib/r2`, `src/lib/geocode`, `src/lib/sync/{property-title,slugify}`.
- **Mode decides what is editable; `source` stays the origin.** Switching never rewrites `source` (no conflicts on `unique (source, external_id)`, reversible):
  - `admin` mode: every property is editable (also `source = 'plektan'` ones), admin create is on, the sync skips (already in `run-sync`).
  - `plektan` mode: admin create is off; every property is read-only except the SEO fields (`seo_title`, `seo_description`); `source = 'admin'` rows can additionally be published / hidden. Photos read-only.
- New migration: `select` policies for `authenticated` using `is_admin()` on `properties` (every status) and `property_photos` (every photo). No write policies: writes go through the service role after `requireAdmin()`. Column privileges can't be per-user, so `house` / `raw` are read with the service role on the edit page after the admin check. Types regenerated.
- `src/lib/db/admin-properties.ts`: list (filters in the URL: `status` all | `published` | `hidden` | `draft` (hidden and never published), `source`, `deal`, `type`, `q` (title / locality / district / street `ilike`, digits → `external_id`), `page`; 20 per page, newest `updated_at` first, total count, cover photo); `getAdminProperty(id)` (all columns + photos + agent); writes (create, update, publish, hide, delete draft, photos).
- Title: suggested by `buildPropertyTitle` from the form fields, editable. Slug: `createSlug(title)`; regenerated from the title on save while `published_at` is null, frozen after the first publish, never editable by hand.
- Publish requires deal, type, locality, title (zod); price is optional («Ціна за запитом», as on the site); no photos → a warning, not a block. New properties are created `hidden` (draft). Delete only when `published_at` is null (row + its R2 objects); published ones are only hidden (7-day sold page, then 404).
- Price: `price_amount` + `currency`; `price_usd` = amount / rate from `settings.exchange_rates`; `price_per_m2` = amount / `area_total` (rounded) when both are set. Description: plain text.
- Coordinates: on save, when the address changed or `lat/lng` are empty, geocode via `src/lib/geocode` (fixture mode locally), rounded to 3 decimals; not found → `lat/lng` null and a warning («Адресу не знайдено, карти на сторінці не буде»).
- Agent: select from active agents (or none).
- Exchange rates: UAH and EUR per 1 USD, edited on `/admin/settings`; saving recomputes `price_usd` for every property with a price (both sources).
- Every write revalidates `properties`, `property:<slug>` (and `settings` for the rates).
- Photos: the browser resizes each file to 480 / 960 / 1600 px wide (never upscaled) as WebP; where the browser can't encode WebP (Safari / iPhone) — JPEG quality ~0.82, `.jpg` keys. Same key layout and row shape as 003: `properties/<property_id>/<hash>-<w>.<ext>`, `r2_key` = the 960 one (or the largest below), `sizes` keyed by real width, `width`/`height` of the largest, `source_url` null. Upload: `POST /api/admin/photos` (route handler, `requireAdmin()`, mode check, zod-validated multipart: property id + the sizes; content type, size and count checked) → R2 → `property_photos` row appended. R2 access in `src/lib/r2`: the R2 **binding** on Cloudflare (`getCloudflareContext().env`, binding `PHOTOS_BUCKET`), else the S3 API (`R2_*`, Node sync), else fixture mode (`public/r2-local/`, dev). Limits: 40 photos per property, source files up to 30 MB, JPEG / PNG / WebP / HEIC (HEIC only where the browser decodes it; otherwise a plain error). Cover = position 0. Photos appear after the draft is first saved.

## Slices

### [x] 1. Settings: source switch + exchange rates
- **Build:** migration (admin select policies) + types. `ADMIN_NAV` gets «Налаштування». `/admin/settings`: current mode with a plain explanation, last sync time, a switch with a confirm dialog listing the consequences and counts (to `admin`: «N об'єктів з Plektan стануть редагованими, синхронізація зупиниться»; to `plektan`: «зміни в об'єктах з Plektan перезапишуться при наступній синхронізації, ваші фото до них видаляться; N ваших об'єктів лишаться, їх можна лише сховати чи опублікувати»). Rates form (UAH, EUR per USD, positive numbers) → save recomputes `price_usd` and revalidates. Server actions with `requireAdmin()` + zod; results announced. `src/lib/auth` or `src/lib/db`: a helper `canEditProperty(mode, source)` / `canCreateProperty(mode)` used by later slices. Loading, error states.
- **Files:** `supabase/migrations/*_admin_properties.sql`, `src/lib/supabase/database.types.ts`, `src/lib/db/settings.ts`, `src/lib/db/admin-properties.ts`, `src/features/admin/settings/*`, `src/features/admin/admin-nav.ts`, `src/app/admin/(panel)/settings/*`, `docs/setup.md`
- **Agent:** backend → designer
- **Accept:**
  - [x] the sync doesn't run in `admin` mode (`pnpm sync` logs skipped); admin create is disabled in `plektan` mode (helper + tests)
  - [x] switching asks for confirmation with the consequences; non-admins can't call the actions
  - [x] saving rates recomputes `price_usd` of every priced property; invalid rates are rejected with a message
  - [x] an admin session reads hidden properties and their photos; anon still can't

### [x] 2. Properties list
- **Build:** `ADMIN_NAV` gets «Об'єкти» (first). `/admin/properties`: filters (status incl. «Чернетка», source, deal, type) and search, pagination, all in the URL; each row: cover thumbnail (placeholder when none), title (truncated with `title`), price via `formatPrice` (or «Ціна договірна»), status badge (icon + word), source, updated date (`uk-UA`, Kyiv). Table from `lg`, cards below. «Додати об'єкт» button (disabled with an explanation in `plektan` mode). Skeleton, error with retry, empty states (no properties yet vs nothing matches + «Скинути фільтри»).
- **Files:** `src/lib/db/admin-properties.ts`, `src/lib/db/admin-property-filters.ts` (+ test), `src/features/admin/properties/*`, `src/app/admin/(panel)/properties/{page,loading,error}.tsx`
- **Agent:** backend (data) → designer (UI)
- **Accept:**
  - [x] filters, search (title / address / Plektan №), pagination survive reload (URL)
  - [x] loading, both empty states, error with retry; table at 1280px, cards at 375px without horizontal scroll

### [x] 3. Create / edit form
- **Build:** `/admin/properties/new` and `/admin/properties/[id]`: sections «Основне» (deal, type, `prop_kind` options by type, title with «Підставити з параметрів»), «Ціна» (amount, currency), «Площа і параметри» (areas, rooms, storey / storeys, repair, wall material, housing class, newbuilding), «Адреса» (locality, district, street, house — house marked as not shown publicly), «Опис», «Агент», «SEO» (title, description with length hints). Ukrainian labels for every Plektan list value. zod schema shared by client and server matching the DB constraints (non-negative numbers, integers where the column is int, enums, max lengths). Actions: save (create → redirect to the edit page), publish (checks the required fields), hide, delete draft (confirm). Slug shown read-only with a note when frozen. Geocoding on save with the warning. Read-only rendering per mode (`plektan`: all disabled except SEO; publish/hide only for `source = 'admin'`), with a banner explaining why. Plektan rows show «№ у Plektan». Link «Відкрити на сайті» for published / recently hidden. Not found → 404 in the admin shell. Every result announced; unsaved changes kept on validation errors.
- **Files:** `src/lib/db/admin-properties.ts`, `src/features/admin/properties/*` (form, schema + tests, actions), `src/app/admin/(panel)/properties/{new,[id]}/*`
- **Agent:** backend (schema, actions, geocode, slug) → designer (form UI)
- **Accept:**
  - [x] validation matches the DB constraints (schema tests); invalid input shows inline errors, no DB error leaks
  - [x] slug follows the title until the first publish, then stays stable through title changes
  - [x] create → draft → publish shows on the site (revalidated); hide → sold page; delete only for never-published drafts
  - [x] in `plektan` mode only SEO fields are editable (also enforced on the server)
  - [x] the form works at 375px; labels, focus, 44px targets

### [ ] 4. Photos
- **Build:** on the edit page: drop zone + «Додати фото» (`<input type="file" accept="image/*" multiple>`; on phones it offers the camera), browser resize (`createImageBitmap` with EXIF orientation → canvas → WebP / JPEG fallback at 480/960/1600), per-file progress («Обробка», «Завантаження N%» via XHR, «Готово», error with «Повторити»), uploads run 2 at a time. Grid of photos: cover badge on the first, «Зробити обкладинкою», «Вгору / Вниз» buttons, drag & drop on desktop (pointer), «Видалити» with confirm (row, then R2 objects). Reorder saved in one action (parking positions like 003). `POST /api/admin/photos`; `src/lib/r2` gains the binding path; R2 delete of removed photos. Limits and errors in plain Ukrainian. Read-only in `plektan` mode. Every change revalidates the property.
- **Files:** `src/lib/r2/*`, `src/app/api/admin/photos/route.ts`, `src/features/admin/properties/photos/*`, `src/lib/db/admin-properties.ts`, `docs/setup.md`, `.env.example`
- **Agent:** backend (route, R2, reorder/delete) → designer (UI, browser resize)
- **Accept:**
  - [ ] large photos (10+ MB) are handled; progress shown per file
  - [ ] the stored sizes and keys match the 003 format; the site shows uploaded photos (fixture mode locally)
  - [ ] reorder, cover and delete work by keyboard and touch; deleted photos leave no R2 objects
  - [ ] non-admins and `plektan` mode can't upload (route answers 401/403)

## External needs
- R2 bucket + public URL (from 003) and an R2 binding `PHOTOS_BUCKET` in `wrangler.jsonc` for the Worker (see `docs/setup.md`).
- New migration to apply (slice 1).
- Client decision: whether to migrate properties from the old WordPress site, and who does it.

## Open questions
- **Decided 2026-10-29:** switching modes doesn't rewrite `source`; the mode decides what is editable. Back to `plektan`: admin edits of Plektan rows are overwritten by the next sync and their admin photos removed; admin-created rows stay, only publish/hide + SEO.
- **Decided 2026-10-29:** confirm dialog with consequences and counts; any admin can switch.
- **Decided 2026-10-29:** rates edited in `/admin/settings`; saving recomputes `price_usd` for every priced property.
- **Decided 2026-10-29:** list columns/filters as in slice 2; title suggested by the 003 generator, editable; slug frozen after the first publish; new = draft; publish needs deal, type, locality, title; geocode on save, no map picker; agent from active agents (agent management later); delete only never-published drafts; plain-text description.
- **Decided 2026-10-29:** browser resize → `/api/admin/photos` → R2 binding on Cloudflare; WebP, JPEG fallback where the browser can't encode WebP, no new library; 40 photos, 30 MB, JPEG/PNG/WebP/HEIC; up/down + cover buttons besides drag & drop; photos after the first save.
- **Decided 2026-10-29:** 4 slices (settings, list, form, photos).
- Old WordPress site: migrate properties? Who? Out of 008 (stack.md → Відкриті питання).
- Agents can't be added or edited in the admin; matters if Plektan is dropped.
- **Fixed in slice 1:** a new draft got `hidden_at` on insert, so the public 7-day sold window would expose it via REST. `set_property_hidden_at()` now sets `hidden_at` only for rows that were published once (`published_at` set).
- Admin list shows the total above the list («Усього N об'єктів»), not in the heading (would need an extra query before the header renders).
- Search by a digits-only `q` matches the whole Plektan number exactly (no partial matches).
- `supabase/seed.sql` gained one draft (hidden, never published) for the admin list.
- Form decisions (slice 3): changing the type clears parameters that type doesn't use; publish is disabled while the form has unsaved changes (the server publishes the stored row); a leave-page warning for unsaved changes; an inactive current agent stays in the select marked «(вже не працює)». Deleting a draft is admin-mode only (also for admin-source drafts in `plektan` mode).
- The form submits via `onSubmit` + `startTransition`, not `action=`: React 19's automatic form reset put controlled selects back to their first option after a save.
- `shadcn add alert-dialog` wanted to overwrite our `button.tsx` and pull an npm package `cn`; the primitive was written from `shadcn view` instead (tokens only).

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-29 | 1 | done | Migration `20261029120000_admin_properties.sql`: admin select policies on `properties` / `property_photos` (all statuses), drafts never public (`hidden_at` only after a publish), `save_exchange_rates(uah, eur)` (settings + `price_usd` recompute in one transaction, service role only). Local: admin sees 2 hidden + their photos, anon / non-admin don't; draft insert invisible to anon; `pnpm sync` in admin mode → skipped. `property-permissions.ts` (`canCreateProperty`, `canEditProperty`) + tests; actions `switchPropertiesSource` (`confirm=yes`), `saveExchangeRatesAction`. UI `/admin/settings`: mode, last sync, counts, confirm dialog with consequences, rates form with inline errors; skeleton, error; 375/1280 checked. Files: `supabase/migrations/*`, `src/lib/db/{admin-properties,property-permissions}*.ts`, `src/features/admin/settings/*`, `src/app/admin/(panel)/settings/*`, `src/components/ui/alert-dialog.tsx`, `docs/setup.md` |
| 2026-10-29 | 2 | done | `src/lib/db/admin-property-filters.ts` (URL schema, never throws; link builder resets page; PostgREST-safe search: quoted `or` values, digits → exact `external_id`) + tests; `getAdminProperties` (session client / RLS, 20 per page, cover via embedded position 0, `listStatus` published / hidden / draft; never selects `raw` / `house`). UI `/admin/properties`: «Об'єкти» first in the nav, auto-submit filters (status incl. drafts, source, deal, type) + search, table from `lg` / cards below, thumbnail or placeholder, status badge (icon + word), price «Ціна за запитом» when empty (as on the site), «Додати об'єкт» disabled with an explanation in `plektan` mode, pagination, skeleton, error, empty states. Local: 31 total, draft 1, hidden 2, plektan 4, page 2 = 11; 375/1280 no horizontal scroll. Seed: one draft. Files: `src/lib/db/admin-propert*.ts`, `src/features/admin/properties/*`, `src/app/admin/(panel)/properties/*`, `src/lib/photos/photo-src-set.ts`, `supabase/seed.sql` |
| 2026-10-29 | 3 | done | `property-form-schema.ts` (shared zod, comma decimals, spaces in numbers, prop_kind by type, currency with price, SEO-only schema, `publishRequirements`) + tests; `property-derive.ts` (`derivePrice`, `nextSlug`, `planGeocode`) + tests; `admin-properties.ts`: `getAdminProperty` (service role after `requireAdmin`, no `raw`), `getActiveAgents`, create / update / SEO update / publish / hide / delete draft (R2 keys via `photo-keys.ts`), geocode on address change (never fails the save); `revalidate-property.ts`; actions enforce mode + permissions on the server. UI `/admin/properties/new`, `/admin/properties/[id]`: sectioned form, fields by type, «Підставити з параметрів», slug note, publish card (missing fields announced and focused), delete-draft dialog, read-only banner + SEO-only save in `plektan` mode, skeleton, error, not-found. Local (admin + plektan modes, 375/1280): create → draft invisible to anon, slug follows title until publish then stays, publish → `/catalog/<slug>` 200, hide, delete draft; plektan rows SEO only. Files: `src/features/admin/properties/*`, `src/lib/db/{admin-properties,property-derive,revalidate-property,property-values}.ts`, `src/lib/photos/photo-keys.ts`, `src/app/admin/(panel)/properties/{new,[id]}/*` |
