# 017 — Launch hardening: leads that wait for keys, sync guard, cleanup

**Status:** in-progress · **Depends on:** 016 · **Route(s):** `/admin/leads`, `/admin/leads/[id]`

## Goal
When the real accounts are connected one by one, no lead stays undelivered silently and no demo data reaches the real database: leads saved before a channel had its keys are sent once the keys exist, the manager learns about leads that never reached Telegram, and `pnpm sync` refuses to write Plektan fixtures into a real Supabase. It also removes the stale and unused code found in spec 016.

## Scope
- In:
  - `skipped` stops being final: the retry cron sends recent `skipped` leads once their channel is configured, and the admin can send any `skipped` lead by hand.
  - One Telegram alert per lead whose Telegram delivery ran out of attempts, sent when Telegram works again.
  - `pnpm sync` on the `supabase` driver without `PLEKTAN_API_KEY` stops with an error unless `--fixtures` is passed.
  - Delete the dev page `/design/diagrams` and the unused browser Supabase client.
  - `docs/diagrams.md` (+ `pnpm diagrams`) and `docs/setup.md` follow every change.
- Out:
  - A second alert channel (email, SMS) for the case when Telegram never comes back.
  - Changing the retry schedule (5 attempts: 5 min, 15 min, 1 h, 3 h) or the Plektan alert.
  - The demo seed's `properties_source = admin`: it stays (see Open questions → Decided).
  - Connecting the accounts themselves: that is the user's work by `docs/setup.md`.

## Data
- `leads`: new column `telegram_alerted_at timestamptz null` (new migration in `supabase/migrations/`; mirrors `plektan_alerted_at`). No new table, RLS unchanged (leads stay admin-only).
- `src/lib/db/leads.ts` + both drivers (`src/lib/db/supabase/`, `src/lib/demo/db/`): a function that requeues recent `skipped` channels, `getLeadsToAlert` / `markAlerted` extended to the Telegram channel. Driver contract tests cover both.
- `src/features/leads/`: `deliver-lead.ts`, `retry-leads.ts`, `lead-delivery-content.ts`, `retry-schedule.ts`.
- `scripts/sync.ts`; no change to `src/lib/plektan/` or `src/lib/telegram/` clients.
- Regenerate: `src/lib/supabase/database.types.ts`, `supabase/seed.sql` (`pnpm seed:sql`), `docs/diagrams.html` (`pnpm diagrams`).

## Slices

### [x] 1. `pnpm sync` never writes fixtures into a real database
- **Build:** today the Plektan client falls back to fixtures when `PLEKTAN_API_KEY` is empty, and only the GitHub workflow checks the key; a local `pnpm sync` with real Supabase keys in `.env.local` would insert the fixture listings. `scripts/sync.ts` stops with exit code 1 and a clear message when the driver is `supabase` and the key is empty, unless `--fixtures` is passed (for a local Supabase). `scripts/check-sync.ts` keeps working (it calls `runSync` directly against the local stack).
- **Files:** `scripts/sync.ts`, `docs/setup.md`, `docs/diagrams.md` (diagram 7, if the guard changes a block or its sentence), `docs/diagrams.html`
- **Agent:** backend
- **Accept:**
  - [x] `DATA_DRIVER=supabase` + empty `PLEKTAN_API_KEY`: `pnpm sync` prints why it stopped and how to run with fixtures on purpose, exits 1, writes nothing
  - [x] the same with `--fixtures` runs the fixture sync as today; with a key set the flag is rejected (exit 2), so it can't be left in a real command by mistake
  - [x] demo driver: unchanged (notice, exit 0); the GitHub workflow is unchanged and still skips without the key
  - [x] `docs/setup.md` describes the guard and the flag next to the «Run it by hand» text
  - [x] typecheck, lint, test, build green

### [x] 2. Leads saved before the keys are sent once the keys exist
- **Build:** a channel that is `off` when a lead arrives is marked `skipped`, and nothing ever picks it up again (the cron takes only `pending` / `failed`; the admin shows the retry button only for `failed`). Change:
  - the retry cron, before its due query, moves `skipped` → `pending` for each channel that is now on (live or fixture), for leads created within the last `SKIPPED_REQUEUE_DAYS` (7); they are delivered by the normal rules in the same or the next run. A channel that is still `off` is never touched, so an agency without Plektan keeps `skipped` forever;
  - the admin lead page shows «Надіслати» for a `skipped` channel when that channel is on now (any age); it makes one attempt, like the manual retry. When the channel is off the row stays «Вимкнено» without a button.
- **Files:** `src/lib/db/leads.ts`, `src/lib/db/supabase/leads.ts`, `src/lib/demo/db/leads.ts`, `src/lib/db/write-driver-contract.test.ts`, `src/features/leads/{deliver-lead,retry-leads,retry-schedule}.ts` + tests, `src/features/admin/leads/{actions.ts,delivery-channel.tsx,retry-delivery.tsx,retry-state.ts}`, `docs/setup.md`, `docs/diagrams.md` (diagrams 8 and 9), `docs/diagrams.html`
- **Agent:** backend (the button reuses the existing retry UI)
- **Accept:**
  - [x] unit test: a lead with `telegram_status = skipped`, 2 days old, Telegram now on → after one cron run the channel is `sent`, attempts = 1
  - [x] unit test: the same lead 8 days old stays `skipped` after the cron; the manual «Надіслати» sends it
  - [x] unit test: channel still off → nothing changes, no attempt is counted
  - [x] a `sent` channel is never sent twice (requeue touches `skipped` only); the two channels stay independent
  - [x] driver contract test passes on the demo driver (and on Supabase when a local DB is up)
  - [x] admin at 375px: the button is a 44px target, has a pending state and shows the result like the existing retry
  - [x] `docs/setup.md` says what happens to leads that arrived before a channel was configured
  - [x] typecheck, lint, test, build green

### [ ] 3. Alert when a lead never reached Telegram
- **Build:** after the 5th failed Telegram attempt a lead is only visible in the admin; nobody is told (the existing alert covers Plektan only). The cron, when Telegram is on, sends one alert per lead whose Telegram channel is `failed` with all attempts used and `telegram_alerted_at` empty, then sets `telegram_alerted_at`. Same shape and rules as the Plektan alert: name, phone, link to the lead in the admin; a failed alert isn't marked, so the next run tries again. A lead exhausted on both channels gets one message that names both, not two.
- **Files:** new migration `supabase/migrations/<ts>_leads_telegram_alerted_at.sql`, `src/lib/supabase/database.types.ts`, `src/lib/db/leads.ts` + both drivers + contract test, `src/lib/demo/seed/` (types / lead rows), `supabase/seed.sql`, `src/features/leads/{retry-leads,lead-delivery-content}.ts` + tests, `docs/setup.md`, `docs/diagrams.md` (diagrams 4 and 9), `docs/diagrams.html`
- **Agent:** backend
- **Accept:**
  - [ ] unit test: an exhausted Telegram lead gets exactly one alert across two cron runs; a failed alert is repeated on the next run
  - [ ] unit test: exhausted on both channels → one message naming both; both `*_alerted_at` are set
  - [ ] Telegram off → no alert, nothing marked
  - [ ] the migration only adds the nullable column; types regenerated; `pnpm seed:sql` leaves no drift; the migration is listed in `docs/setup.md` and under External needs
  - [ ] the alert text has no data beyond name, phone and the admin link; nothing personal is logged
  - [ ] typecheck, lint, test, build green

### [ ] 4. Remove the stale diagrams page and the unused Supabase browser client
- **Build:** delete `src/app/design/diagrams/` (hand-drawn as of spec 008, replaced by `docs/diagrams.html`) and `src/lib/supabase/client.ts` (no importer). Remove the `BrowserClient` block and its row from diagram 3 and fix the «four clients» wording where it appears.
- **Files:** `src/app/design/diagrams/*` (deleted), `src/lib/supabase/client.ts` (deleted), `docs/diagrams.md`, `docs/diagrams.html`, `docs/conventions.md` (Supabase clients: two, not three), any doc that mentions either
- **Model:** haiku
- **Accept:**
  - [ ] `/design/diagrams` answers 404 in dev; `/design` still renders
  - [ ] no reference to `design/diagrams` or `supabase/client` is left in `src/`, `docs/` (except spec logs), `e2e/`
  - [ ] `pnpm diagrams` passes and the drift test is green
  - [ ] typecheck, lint, test, build green

## External needs
- Apply the new migration from slice 3 to the remote Supabase (the user; agents never touch the remote database).
- Nothing else: no new keys or accounts. The slices are built and tested on the demo driver and the fixture modes.

## Open questions
- **Decided (2026-11-12, user):** the stale `/design/diagrams` page is deleted, not redirected.
- **Decided (2026-11-12):** the demo seed keeps `properties_source = admin` so the demo admin can create and edit listings; a real database starts in `plektan` (migration default), and `docs/setup.md` already tells the user to switch it to `admin` if the agency won't use Plektan. No code change.
- **Decided (2026-11-12, user):** the cron sends `skipped` leads automatically for 7 days back (`SKIPPED_REQUEUE_DAYS = 7`); older ones only by hand, so a channel connected weeks later doesn't flood the manager's chat.
- **Decided (2026-11-12, user):** `getDistricts` in the Plektan client stays (part of the documented API map, diagram 6).
- **Decided (2026-11-12, user):** no «Не доставлено» filter in the admin leads list in this spec; the alert covers the need.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-11-12 | 1 | done: `pnpm sync` stops (exit 1) on supabase without `PLEKTAN_API_KEY`; `--fixtures` runs fixtures on purpose, rejected (exit 2) with a key; diagram 7 unchanged (the workflow skip is the same) | `scripts/sync.ts`, `src/lib/sync/sync-guard.ts` + test, `docs/setup.md` |
| 2026-11-12 | 2 | done: the cron requeues `skipped` → `pending` for channels that are on, leads younger than `SKIPPED_REQUEUE_DAYS` (7); the admin shows «Надіслати» for a `skipped` channel that is on (one attempt, any age); the demo seed's skipped lead is now sent by the cron when fixtures are on (intended); the Supabase `requeueSkippedLeads` update is untested against a local Postgres (none here) | `src/features/leads/{retry-leads,deliver-lead,retry-schedule}.ts` + tests, `src/lib/db/{leads,driver-types}.ts`, both lead drivers, `write-driver-contract.test.ts`, `src/features/admin/leads/{delivery-channel,retry-delivery,lead-delivery-card}.tsx`, `docs/setup.md`, `docs/diagrams.{md,html}` |
