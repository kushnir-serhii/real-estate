# 011 — Demo mode: a local-first template

**Status:** in-progress · **Depends on:** 010 · **Route(s):** every route (site, admin, API); new `GET /api/demo/photos/[...key]`, `POST /api/demo/reset`

## Goal
The project is a pet project / template right now: no Supabase, Cloudflare, Plektan, Telegram or LLM accounts will be connected. Anyone can clone the repo, run `pnpm install && pnpm dev` **without Docker, keys or network access to third-party services**, and see the whole product working on mock data: the design, the speed and every feature (catalog, property page, forms and lead pipeline, AI assistant, the admin with sign-in, leads, properties and photos, pages, SEO). The same build can be deployed as a public demo with an open admin. Every seam that prepares the real connection stays in place, so switching to the real services later is a config change (`DATA_DRIVER=supabase` + keys), not a rewrite. The site becomes a neutral starting point for a new agency project.

## Scope
- In:
  - **Data driver seam:** every data-access function in `src/lib/db/` (and the auth / photo / sync code that talks to Supabase) gets two implementations behind one interface: `supabase` (today's code, unchanged in behaviour) and `demo` (in-memory store seeded from typed mock data). `DATA_DRIVER=demo|supabase`; empty = `demo` unless the Supabase env is set.
  - **Demo store:** in memory, per process (per isolate on Workers), seeded on first use, survives HMR (`globalThis`), resets on restart and with «Скинути демо-дані» in the admin. It mirrors the RLS rules in code: the public reads see only published, not hidden properties and published pages; leads, conversations and admins are reachable only through admin functions.
  - **One source of mock data:** typed fixtures in `src/lib/demo/seed/` (agents, properties, photos, pages, settings, a few leads and an AI conversation for the admin). `supabase/seed.sql` is generated from them (`pnpm seed:sql`), with a test that fails when they drift.
  - **Demo admin:** sign-in page shows «Увійти як демо-адміністратор» (one click, no password); the session is a signed, `httpOnly` cookie (HMAC via Web Crypto, Workers-compatible). All admin features work against the demo store; photo uploads are kept in memory (size caps) and served by `GET /api/demo/photos/[...key]`. A thin banner on the admin (and a small footer note on the site) says «Демо-режим: дані тестові, зміни скидаються».
  - **Nothing loaded from third parties at runtime or build:** Manrope via `next/font/local` (woff2 + OFL licence in the repo); maps fully offline (static SVG map with a pin, no tiles, Leaflet removed); the Plektan badge stored in `public/` and shown only when the Plektan integration is on; a Playwright check that fails when any request leaves `localhost`.
  - **Neutral demo brand:** a fictional agency name, logo, favicon, OG image, contacts, emails `@example.com`, agents and listing texts; all of it in `src/constants/` and the seed. `docs/template.md`: how to start a new project from this template.
  - **Speed baseline:** measure the key routes (transfer size, JS size, LCP/CLS in a local production build) and fix the obvious problems.
  - **Docs:** CLAUDE.md, `docs/process.md`, `docs/setup.md`, `docs/product.md`, `.env.example`, a README quickstart: Docker and local Supabase become optional (only to test the `supabase` driver).
- Out:
  - Connecting or deploying anything (Supabase, Cloudflare, Plektan, Telegram, OpenAI). The user does it later, following `docs/setup.md`.
  - Persisting demo data between restarts (no JSON files, no KV, no D1).
  - Removing the Supabase driver, migrations, generated types, RLS or any service client and its fixture mode.
  - Rewriting UI that isn't touched by the items above; new product features.
  - Running the Plektan sync into the demo store (the sync is a separate Node process; in demo mode `pnpm sync` prints a notice and exits 0; the Plektan fixture listings are already part of the demo seed).

## Data
- No new tables or migrations. `supabase/seed.sql` becomes generated output.
- New: `src/lib/data-driver.ts` (reads `DATA_DRIVER`, validates it, exposes `isDemoMode()`), `src/lib/demo/` (`store.ts`, `seed/*`, `reset.ts`, `session.ts`, `photos.ts`), `src/lib/db/drivers/{supabase,demo}/` (or one file per driver next to each data module, whichever keeps the diff smaller; decided in slice 1 and written into `docs/conventions.md`).
- The demo rows are typed with `Database["public"]["Tables"][…]["Row"]` from `src/lib/supabase/database.types.ts`, so a migration that changes a column breaks the demo at compile time instead of drifting silently.
- Callers (`src/features/**`, `src/app/**`) keep importing the same functions from `src/lib/db/*`; no feature code branches on the driver.
- Env (`.env.example`): `DATA_DRIVER` (empty = auto), `DEMO_SESSION_SECRET` (empty = fixed dev secret + a warning; set in a public deploy), `DEMO_UPLOAD_MAX_MB` (empty = 2 per photo, 40 total).

## Slices

### [x] 1. Data driver seam + demo store for public reads
- **Build:** `src/lib/data-driver.ts`; the driver interface for the public reads (properties list / detail / featured, district options, agents, pages, settings, sitemap); the `supabase` driver keeps today's queries unchanged; the `demo` driver filters, sorts and paginates the in-memory rows exactly like the SQL + RLS (published only, `hidden_at` null, catalog filters, price in USD via the exchange rates, the same `PropertyFilters`). Port `supabase/seed.sql` + the Plektan fixture listings to `src/lib/demo/seed/`. Caching (`unstable_cache` / tags) works the same in both drivers. `proxy.ts` and `src/lib/supabase/env.ts` no longer throw when Supabase isn't configured in demo mode.
- **Files:** `src/lib/data-driver.ts`, `src/lib/demo/*`, `src/lib/db/{properties,pages,agents,settings,property-values}.ts` (+ driver files), `src/features/catalog/load-district-options.ts`, `src/app/sitemap.ts`, `src/proxy.ts`, `src/lib/supabase/env.ts`, `.env.example`
- **Agent:** backend · **Model:** sonnet
- **Accept:**
  - [x] with an empty `.env.local` and Docker stopped, `pnpm dev` serves `/`, `/catalog` (every filter, sort, pagination), a property page, a sold / hidden property (the 005 states), `/contacts`, static pages, `sitemap.xml` without errors
  - [x] `DATA_DRIVER=supabase` with the local Supabase gives the same pages as before this spec (no change in behaviour)
  - [x] contract tests (vitest) run the same cases against the demo driver: published-only, filters, sort, pagination, budget currency; the Supabase run is skipped when no local DB is reachable
  - [x] the demo rows are typed from `database.types.ts`; an invalid `DATA_DRIVER` fails with a clear message

### [ ] 2. Demo writes: leads, assistant, cron
- **Build:** demo driver for `leads.ts` (`createLead` with `client_request_id` dedupe, delivery status, retry fields), `assistant.ts` (conversations, messages, proposal, usage, rate limits, spend counter, 30-day cleanup), the `/api/cron/*` handlers. The 006 pipeline and the 010 assistant run unchanged on top of it, with the Plektan / Telegram / LLM / Turnstile fixture modes they already have.
- **Files:** `src/lib/db/{leads,assistant}.ts` (+ driver files), `src/features/leads/submit-lead.ts`, `src/features/assistant/assistant-limits.ts`, `src/lib/cron/*`
- **Agent:** backend · **Model:** sonnet
- **Accept:**
  - [ ] every site form creates a lead in demo mode; a double submit makes one lead; delivery statuses follow the fixture env (`skipped` / `sent` / `failed`) exactly as on Supabase
  - [ ] the AI chat works end to end in demo mode: answers, property cards, lead card → an `ai` lead with the server-side payload; limits and the spend cap still apply
  - [ ] `/api/cron/leads` and `/api/cron/assistant` work on the demo store
  - [ ] contract tests for lead dedupe, retry selection and conversation cleanup run against the demo driver

### [ ] 3. Demo admin: sign-in, CRUD, photos, reset
- **Build:** `src/lib/demo/session.ts` (sign / verify the cookie, `DEMO_SESSION_SECRET`); `getAdminSession` / `requireAdmin` / `proxy.ts` use it in demo mode; the sign-in page shows «Увійти як демо-адміністратор» in demo mode and the email + password form otherwise; sign-out clears the cookie. Demo driver for `admin-leads`, `admin-properties`, `admin-property-photos`, `admin-pages`, `property-permissions`. Photo upload in demo mode: validated as today (type, size, image decode), stored in memory with `DEMO_UPLOAD_MAX_MB` caps, served by `GET /api/demo/photos/[...key]` (long cache, correct content type), `photoUrl()` points there for demo-uploaded keys. «Скинути демо-дані» in the admin (`POST /api/demo/reset`, admin only, revalidates the cache). The demo banner on the admin layout and a short note in the site footer.
- **Files:** `src/lib/demo/{session,photos,reset}.ts`, `src/lib/auth/admin-session.ts`, `src/features/admin/auth-actions.ts`, `src/app/admin/sign-in/page.tsx`, `src/app/admin/layout.tsx`, `src/lib/db/admin-*.ts` (+ driver files), `src/lib/photos/photo-url.ts`, `src/lib/r2/*`, `src/app/api/demo/*`, `src/components/layout/site-footer.tsx`
- **Agent:** backend → designer (sign-in button, banner, reset confirm) · **Model:** sonnet
- **Accept:**
  - [ ] one click signs in; `/admin/**` without the cookie redirects to sign-in; a tampered cookie is rejected; on the `supabase` driver the demo button and route are absent and return 404
  - [ ] in demo mode: leads list, filters and detail (with the AI transcript), property create / edit / publish / hide / delete, photo upload / reorder / delete, pages edit all work, and the public site shows the change after save
  - [ ] uploads over the caps get a clear error; reset restores the seed and the site shows it
  - [ ] banner and button at 375px and 1280px, keyboard, focus, contrast (WCAG 2.1 AA)

### [ ] 4. No third-party requests: font, maps, badge, network check
- **Build:** `next/font/local` with Manrope (variable woff2, latin + cyrillic) in `src/app/fonts/` + `OFL.txt`; `next/font/google` removed. Fully offline maps: a `StaticMap` component (`src/features/map/`) draws a stylised SVG of streets / blocks with the pin, the address and a plain link «Відкрити на мапі» (a link, not a request); used on the property page and on `/contacts`; Leaflet, its CSS, `@types/leaflet` and the OSM iframe removed. The Plektan badge image saved to `public/partners/` and rendered only when the Plektan integration is on (`PLEKTAN_API_KEY` set). Playwright: `ui-check` records every request and fails on any host other than `localhost` (links aren't followed). Audit what else could reach out (Turnstile script only with a site key, JSON-LD URLs are text) and record the result in the log.
- **Files:** `src/app/layout.tsx`, `src/app/fonts/*`, `src/features/map/*`, `src/features/property/property-location.tsx`, `src/features/property/property-map*.{ts,tsx,css}` (removed), `src/features/contacts/map-embed.tsx`, `src/app/(site)/contacts/page.tsx`, `src/components/layout/{plektan-button,site-footer}.tsx`, `public/partners/*`, `e2e/ui-check.spec.ts`, `package.json`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [ ] `pnpm build` and `pnpm dev` work with the network to Google Fonts blocked; text renders in Manrope with Cyrillic
  - [ ] `ui-check` on `root,catalog,<a property>,contacts,admin/sign-in` passes with zero external requests
  - [ ] the static map looks intentional in light and dark theme, at 375px and 1280px, has an `aria-label` / text alternative, and works for a property without coordinates (the 005 state)
  - [ ] `leaflet` is gone from `package.json` and the bundle; the property page JS gets smaller (number in the log)

### [ ] 5. Neutral demo brand + template guide
- **Build:** the fictional agency **7 SKY** in `src/constants/{brand,contacts,home,pages,assistant}.ts` (name, tagline, phones `+380 00 000 00 0X`, emails `@example.com`, address, socials as `#` or example handles); the logo from the given mark `public/brand/7sky-mark.svg` (cloud outline with buildings, stroke-only, `currentColor`): `Logo` renders it inline (so it follows the theme colour) next to the «7 SKY» wordmark in the header and footer, the mark alone below ~360px if the header gets tight; the mark's geometry may be tuned (stroke weight, spacing) but not redrawn; favicon (`icon.svg` + `favicon.ico` from the mark, readable at 16px), `public/og-default.png` (1200×630, generated locally, no external images) and listing / agent texts in `src/lib/demo/seed/`; replace «Sofiacity» everywhere in UI copy, fixtures, tests, `site-url.ts` examples and `localStorage` / `sessionStorage` key prefixes (a stored key rename must not crash older stored values). `docs/template.md`: start a new project in steps (brand constants, colours / tokens, mock data, which services to connect and in what order, links to `docs/setup.md`).
- **Files:** `src/constants/*`, `public/brand/7sky-mark.svg`, `src/components/layout/logo.tsx`, `src/app/{favicon.ico,icon.svg,layout.tsx,admin/layout.tsx}`, `public/og-default.png`, `src/lib/demo/seed/*`, `src/lib/plektan/fixtures/data.ts`, `src/lib/theme.ts`, `src/features/{favorites,assistant}/*storage*.ts`, tests that assert the brand, `docs/template.md`
- **Agent:** designer · **Model:** sonnet (text replacement in tests and fixtures: haiku)
- **Accept:**
  - [ ] the site, admin, SEO metadata and the assistant persona say «7 SKY»
  - [ ] `grep -ri sofiacity src public` finds nothing (docs keep the history)
  - [ ] the header, footer and admin show the 7 SKY mark + wordmark; logo, favicon and OG image fit the existing design tokens in both themes; the link keeps its `aria-label`, 44px target and focus ring
  - [ ] the user reviews the logo in the header (375px, 1280px, light and dark) before the slice is committed
  - [ ] a new person can follow `docs/template.md` to rename the brand without searching the code

### [ ] 6. Speed baseline
- **Build:** measure in a local production build (`pnpm build && pnpm start`, demo mode) `/`, `/catalog`, a property page: transferred bytes, JS, LCP, CLS, number of requests (Playwright + `PerformanceObserver`, a script `pnpm perf` that prints a table). Fix what the numbers show (likely: first-screen photo `fetchpriority="high"` + right `sizes`, lazy below the fold, the assistant panel stays lazy, no layout shift from the font / images). Record before / after in the log and a short budget in `docs/conventions.md`.
- **Files:** `scripts/perf.ts` or `e2e/perf.spec.ts`, `package.json`, components the numbers point to, `docs/conventions.md`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [ ] `pnpm perf` runs locally without network and prints the table
  - [ ] on the three routes, mobile emulation: LCP < 2.5 s, CLS < 0.1, first-load JS no bigger than before this spec
  - [ ] the numbers are in the log

### [ ] 7. Docs, seed generation, guards
- **Build:** `pnpm seed:sql` (`scripts/gen-seed-sql.ts`) writes `supabase/seed.sql` from `src/lib/demo/seed/`, plus a test that the committed file matches. `pnpm sync` / `sync:check` exit 0 with a notice in demo mode. Production guard: a build on the `supabase` driver without its env fails with a clear error (as `NEXT_PUBLIC_SITE_URL` does today); a build on the `demo` driver passes and logs «demo mode». Update CLAUDE.md (commands, «Docker isn't needed; local Supabase only to test the `supabase` driver»), `docs/process.md` (safety rules: «local Supabase» → «demo driver; local Supabase optional»), `docs/setup.md` (new first section «Leaving demo mode»: set `DATA_DRIVER=supabase`, keys, `DEMO_*` unset; the R2 binding; the list of what the demo replaces), `docs/product.md` (the demo mode in the technical frame), `docs/README.md`, a root `README.md` quickstart.
- **Files:** `scripts/gen-seed-sql.ts`, `supabase/seed.sql`, `scripts/{sync,check-sync}.ts`, `next.config.ts` or `src/lib/data-driver.ts`, `package.json`, `CLAUDE.md`, `docs/{process,setup,product,README,conventions}.md`, `README.md`
- **Agent:** backend · **Model:** sonnet (docs: haiku)
- **Accept:**
  - [ ] a fresh clone: `pnpm install && pnpm dev` works with no `.env.local`, no Docker, no keys; `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm ui-check` all pass the same way
  - [ ] `pnpm preview` (local workerd, no Cloudflare account) runs the demo, including the admin and a photo upload
  - [ ] `supabase/seed.sql` regenerated; `supabase db reset` on a machine with Docker still loads it
  - [ ] the docs no longer say Docker is required; `docs/setup.md` explains how to leave demo mode

## External needs
- None to build it: no accounts, keys or deploys.
- Later, a public demo deploy: `DEMO_SESSION_SECRET` (long random value) as a runtime secret; keep `DATA_DRIVER` empty or `demo`.
- Later, the real launch: `docs/setup.md` → «Leaving demo mode».

## Open questions
- **Decided:** the demo brand is **7 SKY** (name in `BRAND`; logo mark given by the user: `public/brand/7sky-mark.svg`; colours proposed by the designer in slice 5 on the existing tokens).
- **Decided:** Cloudflare isn't connected; the demo data is hardcoded mock data in the repo (`src/lib/demo/seed/`), held in memory at runtime. Per-isolate behaviour on Workers is accepted as is (the banner says edits reset); no extra work for it.
- **Decided:** mock data, no Supabase / Cloudflare connected now · public demo with an open admin (one-click demo sign-in) · maps fully offline (static SVG map, Leaflet removed) · neutral demo brand, Plektan badge local and shown only with the integration on · in-memory demo store (no persistence).

- **Decided (2026-11-04):** no Docker / local Supabase in this run, and none when the template is published: it's a portfolio piece on mock data. The `supabase` driver keeps today's code behind the interface and is checked by review, typecheck and the (skipped) Supabase contract run; the live criteria «`DATA_DRIVER=supabase` gives the same pages» (slice 1) and «`supabase db reset` loads the seed» (slice 7) are marked «not verified live» in the log.
- **Decided (2026-11-04):** the run doesn't stop at slice 5: it's committed, the header screenshots (375 / 1280, light / dark) go into the final report, review fixes come as a `fix:` commit.
- **Decided (2026-11-04):** 7 SKY gets a new «sky» accent: only the accent tokens in `globals.css` change (AA contrast in both themes), the rest of the palette stays.
- **Decided (2026-11-04):** on the `demo` driver a production build without `NEXT_PUBLIC_SITE_URL` uses `http://localhost:3000` and logs a warning; on the `supabase` driver it still fails with a clear message.
- **Decided (2026-11-04):** driver layout: `src/lib/db/<domain>.ts` stays the facade callers import; implementations live in `src/lib/db/supabase/<domain>.ts` and `src/lib/demo/db/<domain>.ts` (written into `docs/conventions.md` in slice 1).

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-11-04 | 1 | done: facades in `src/lib/db/*` + `supabase/` and `demo/db/` drivers, `data-driver.ts`, demo store on `globalThis`, typed seed (28 public listings, sold + long-hidden + draft states), contract tests (demo run green, Supabase run skipped). `DATA_DRIVER=supabase` not verified live (no Docker, decided). Plektan API fixtures not ported: the seed already has its 4 `plektan` listings. Baseline before the spec (commit 8a75114): 1 402 586 B of client chunks, leaflet chunk 149 078 B | `src/lib/data-driver.ts`, `src/lib/demo/*`, `src/lib/db/{properties,pages,agents,settings,property-query,driver-types,driver-contract.test}.ts`, `src/lib/db/supabase/*`, 7 callers gated by `hasPublicData()`, `src/lib/supabase/{env,proxy}.ts`, `.env.example`, `docs/conventions.md` |
