# 007 — Admin: sign-in + leads

**Status:** in-progress · **Depends on:** 002, 006 · **Route(s):** `/admin`, `/admin/sign-in`, `/admin/leads`, `/admin/leads/[id]`

## Goal
Andrii and staff sign in to the admin and see every lead with its delivery status, even when the CRM is gone, and resend a delivery that failed. The admin shell (sign-in, guard, layout) is reused by 008 and 009.

## Scope
- In: Supabase Auth (email + password), admin role check, admin layout (works at 375px), leads list with filters (kind, date, "not delivered"), search and pagination, lead detail, delivery status + manual retry per channel, a link to the lead in the manager's Telegram message.
- Out: magic link / password reset in the UI (reset via the Supabase dashboard), lead pipeline (statuses, owners, notes — stage 2), properties (008), SEO/pages (009).

## Data
- New migration: `admins` (`user_id uuid primary key references auth.users on delete cascade`, `email text`, `created_at`); RLS on, an admin can read only their own row. `public.is_admin()` — `security definer`, `stable`, `set search_path = ''`, true when `auth.uid()` is in `admins`; `execute` granted to `authenticated` only. `leads`: `select` policy for `authenticated` using `is_admin()`, and `grant select` on `leads` to `authenticated` (it was revoked in 002). No write policies: writes (retry) stay on the service role after the server checks the admin.
- Auth: email + password (`signInWithPassword`). Sign-ups off (`supabase/config.toml` `enable_signup = false`; production: dashboard, see `docs/setup.md`). Admins are created by the user in the Supabase dashboard + one `insert into admins` (documented in `setup.md`). `supabase/seed.sql` creates a local demo admin `admin@lyndrik.local` / `admin12345` (local only).
- Guard: `src/proxy.ts` (already matches `/admin/:path*`) redirects anonymous users to `/admin/sign-in?next=…`; the admin layout re-checks on the server (`getClaims` + `is_admin()`); signed in but not an admin → «Немає доступу» page with «Вийти». Admin data is read with the user-session client (`server.ts`), so RLS is the last line. `/admin/*` is `noindex` (`robots` metadata in the admin layout + `X-Robots-Tag: noindex` header from the proxy). Supabase env empty → the admin shows «Supabase не налаштовано» instead of crashing.
- `src/lib/db/admin-leads.ts`: `getAdminLeads(filters, page)` (20 per page, newest first, total count) and `getAdminLead(id)` with the property (`slug`, `title`, `external_id`). Filters zod schema in the URL: `kind` (all | `property_request` | `general` | `ai`), `from`/`to` (dates, Kyiv day bounds), `q` (name `ilike`, or phone digits match when `q` has digits), `failed=1` (Plektan or Telegram `failed`), `page`.
- Manual retry: a server action (admin checked) → `retryLeadChannel(id, channel)` in `src/features/leads/`: one immediate attempt of that channel only, also when attempts are used up; attempts +1; on failure the status stays `failed` with the error and the cron schedule isn't extended (next attempt only if attempts < 5, by the usual backoff). Only a `failed` channel shows the button.
- Error kinds shown in plain Ukrainian (`timeout` → «Plektan не відповів вчасно», `http 500` → «Помилка на стороні Plektan (500)», …).
- Telegram message (006 `buildTelegramText`) gets a last line «Відкрити в адмінці: <site>/admin/leads/<id>».

## Slices

### [x] 1. Auth, roles, admin shell
- **Build:** migration (`admins`, `is_admin()`, leads select policy + grant) and types regenerated; `enable_signup = false` in `config.toml`; seed admin. `src/lib/auth/` (or `src/lib/db/admins.ts`): `getAdminSession()` → `{ state: 'unconfigured' } | { state: 'anonymous' } | { state: 'forbidden', email } | { state: 'admin', email }`. Proxy redirect for anonymous on `/admin/*` (except `/admin/sign-in`) + `X-Robots-Tag`. `/admin/sign-in`: email + password form (labels, inline errors, pending, wrong credentials message announced with `role="alert"`), server action `signIn` (zod) → redirect to `next` (only same-origin `/admin` paths); `signOut` action. Admin layout (`src/app/admin/(panel)/layout.tsx` or similar): header «Lyndrik · адмінка», nav «Заявки», user email, «Вийти»; mobile layout at 375px; `robots: noindex`. `/admin` → redirect to `/admin/leads`; `/admin/leads` a placeholder page for now. Forbidden and unconfigured states. `docs/setup.md`: migration row, auth settings (sign-ups off, site/redirect URLs), how to add an admin.
- **Files:** `supabase/migrations/*_admins.sql`, `supabase/config.toml`, `supabase/seed.sql`, `src/lib/supabase/database.types.ts`, `src/lib/supabase/proxy.ts`, `src/proxy.ts`, `src/lib/auth/*`, `src/features/admin/*`, `src/app/admin/**`, `docs/setup.md`
- **Agent:** backend (migration, session, proxy, actions) → designer (sign-in page, layout, states)
- **Accept:**
  - [x] anonymous users are redirected from every `/admin` route to sign-in; a signed-in non-admin sees «Немає доступу» and can't read leads (checked with the anon key + a non-admin session against local Supabase)
  - [x] an admin signs in, lands on `/admin/leads` (or `next`), signs out
  - [x] admin pages are `noindex` (meta + header)
  - [x] sign-in page: labels, errors announced, pending state, 375px without horizontal scroll

### [x] 2. Leads list
- **Build:** `getAdminLeads` + filters schema; `/admin/leads` with filters (kind, from/to dates, «Не доставлено» toggle), search by name/phone, pagination — all in the URL. Each lead: date/time (`uk-UA`, Kyiv), kind, name, phone, property title (truncated), delivery badges for Plektan and Telegram (sent / pending / failed / skipped, not by color only). Table on desktop, cards at 375px; the whole row links to the detail. `loading.tsx` skeleton, `error.tsx` with retry, empty state (no leads yet vs nothing matches the filters + «Скинути фільтри»), long names/titles truncated with `title`.
- **Files:** `src/lib/db/admin-leads.ts`, `src/features/admin/leads/*`, `src/app/admin/**/leads/{page,loading,error}.tsx`
- **Agent:** backend (data access) → designer (UI)
- **Accept:**
  - [x] filter by kind and date, «Не доставлено», search by phone/name, pagination; all survive reload (URL)
  - [x] loading, empty (both kinds), error with retry; table at 1280px, cards at 375px without horizontal scroll

### [ ] 3. Lead detail + manual retry
- **Build:** `getAdminLead(id)`; `/admin/leads/[id]`: contact (`tel:`, `mailto:`), kind, created, property (link to the site page, Plektan №), message, wishes from `payload` (deal, type, `similar_to`), page URL, UTM, consent date; delivery card per channel: status, attempts (`n з 5`), error in plain Ukrainian, next attempt time, `plektan_item_id`. «Повторити» on a `failed` channel → server action (admin check, zod) → `retryLeadChannel` → result announced (`role="status"`), page revalidated. `retryLeadChannel` with unit tests (works past 5 attempts, one channel only, no schedule beyond 5). Not found → 404 in the admin shell. Telegram text gets the «Відкрити в адмінці» line (test updated).
- **Files:** `src/lib/db/admin-leads.ts`, `src/lib/db/leads.ts`, `src/features/leads/{deliver-lead,lead-delivery-content}*.ts`, `src/features/admin/leads/*`, `src/app/admin/**/leads/[id]/*`
- **Agent:** backend (retry, data) → designer (UI)
- **Accept:**
  - [ ] a failed delivery shows the error in plain words and a «Повторити» button; with the fixture set to `ok` the retry turns it `sent`, with `fail` it stays `failed` with attempts +1
  - [ ] non-admins can't call the retry action
  - [ ] the Telegram message links to the lead in the admin
  - [ ] detail works at 375px; long values wrap

## External needs
- Admin users: create them in the Supabase dashboard (Authentication → Users → Add user, with a password) and add each to `admins` (SQL in `docs/setup.md`). Real emails are not needed until production.
- Supabase Auth settings in production: sign-ups off, site URL + redirect URLs (see `docs/setup.md`).
- New migration to apply (slice 1).

## Open questions
- **Decided 2026-10-28:** email + password (no SMTP needed); magic link and in-app password reset later if wanted.
- **Decided 2026-10-28:** manual retry = one immediate attempt of one channel, also past 5 attempts; doesn't reset the counter or extend the cron schedule.
- **Decided 2026-10-28:** extras in scope: «Не доставлено» filter, link to the admin lead in Telegram, admin usable at 375px.
- Local `config.toml` keeps `[auth.email] enable_signup = true`: there it switches the whole email provider; sign-ups are off via `[auth] enable_signup = false`.
- On mobile the admin header cuts the email after ~15 characters; fine for now.
- **Decided 2026-10-29:** the leads table starts at `lg` (1024px); below that cards (two per row from `md`). Badges on 375px cards may share a line or wrap.
- `error.tsx` of the leads list was not seen failing locally (no easy way to break the query); its retry is reviewed by reading.
- **Decided 2026-10-28:** 3 slices (auth + shell, list, detail + retry); `admins` table + `is_admin()`, leads read via RLS for admins, writes via service role after the server check.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-29 | 1 | done | Migration `20261028170000_admins.sql` (`admins` + own-row RLS, `is_admin()` security definer, leads select for admins; no writes). Local checks: anon → 42501, non-admin → 0 leads / `is_admin` false, admin → 30 leads; insert/update → 42501; sign-up → `signup_disabled`. Proxy: anonymous `/admin/*` → sign-in with `next`, `X-Robots-Tag` on every admin response; `getAdminSession()` (cached) in the panel layout: unconfigured / forbidden / admin shell. Sign-in (password, safe `next`), sign-out; seed admin + non-admin + 30 demo leads. Playwright: sign-in errors/pending, 375px no scroll, 44px targets. Files: `supabase/{migrations,seed.sql,config.toml}`, `src/lib/supabase/{proxy,database.types}.ts`, `src/lib/auth/*`, `src/features/admin/*`, `src/app/admin/**`, `docs/setup.md` |
| 2026-10-29 | 2 | done | `src/lib/db/admin-lead-filters.ts` (URL schema, never throws; Kyiv day bounds incl. DST; phone-digits vs name search; link builder resets page) + tests; `getAdminLeads` with the session client (RLS). Local: 30 total, ai 2, failed 15, page 2 = 10, non-admin 0. UI: GET filter form (kind/«Не доставлено» apply at once), table from `lg`, cards below, delivery badges (icon + word, `--success`/`--warning` tokens), pagination, skeleton, error with retry, three empty states. Playwright 375/1280 light/dark: no horizontal scroll. Files: `src/lib/db/admin-lead*.ts`, `src/lib/format/format-kyiv-date-time.ts`, `src/features/admin/leads/*`, `src/app/admin/(panel)/leads/*`, `src/app/globals.css` |
