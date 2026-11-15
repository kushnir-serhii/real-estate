# 019 — Visitor accounts with Google: saved properties on every device

**Status:** draft · **Depends on:** 018 · **Route(s):** `/sign-in`, `/auth/callback`, `/account`, `/favorites`

## Goal
A visitor signs in with Google in one click and their saved properties («Обране») follow them to every device and browser. Without an account everything works as now (the list lives in the browser); an account only adds sync, so signing in stays optional and never blocks browsing or leaving a lead.

Google only, on purpose: no passwords, no confirmation or reset emails, so no mail service (SMTP, DNS records) is needed. Email + password is a separate, optional spec: [020](020-email-accounts.md).

## Scope
- In:
  - Supabase Auth with the **Google** provider for visitors: sign in (the first sign-in creates the account), sign out, sign out on all devices, delete the account.
  - Saved properties stored per account (`favorites` table); on sign-in the browser list is merged into the account; hearts and `/favorites` read and write the account list while signed in.
  - `/sign-in` (one «Увійти через Google» button) and `/account` (name, email, sign out, sign out everywhere, delete account).
  - Header entry: «Увійти» when signed out, an account icon when signed in; a soft prompt on `/favorites` («Увійдіть, щоб обране було на всіх пристроях»).
  - Accounts are switchable: no Google provider configured → no sign-in entry anywhere, favorites stay local as today.
  - Both drivers: `supabase` (real Supabase Auth + Google) and `demo` (accounts in memory, Google simulated by a stub consent page), so a fresh clone still runs with no keys.
  - `docs/setup.md`: Google Cloud OAuth client and Supabase provider setup; privacy page text about accounts.
- Out:
  - Email + password, confirmation and reset emails, SMTP — spec [020](020-email-accounts.md), built only if needed.
  - Saved searches, price-drop / new-listing alerts, Telegram login (stage 2).
  - Linking leads to an account, lead history, prefilling forms (later; leads stay anonymous as now).
  - Admin auth changes: admins keep `/admin/sign-in` (email + password, `admins` table).

## How it works for users
1. The visitor presses «Увійти» in the header (or the prompt on `/favorites`) → `/sign-in` with one button «Увійти через Google» and a line «Натискаючи, ви погоджуєтеся з Політикою конфіденційності».
2. The button → server action `signInWithOAuth({ provider: 'google', options: { redirectTo: <site>/auth/callback?next=… } })` → Google's account picker and consent («Diplomat Hall wants your name, email address and profile picture»).
3. Google → Supabase (`https://<project>.supabase.co/auth/v1/callback`) → our `/auth/callback?code=…` → `exchangeCodeForSession(code)` (PKCE) → the browser's saved properties are merged into the account → back to the page the visitor came from (`next`, same-origin paths only).
4. The first sign-in creates the account; later sign-ins open it. No sign-up form, no email to confirm (Google has verified the address), no password to forget.
5. The session lasts until sign-out: the access token (1 h) is refreshed with the refresh token kept in `httpOnly` cookies (`@supabase/ssr`); closing the browser doesn't sign out.
6. Cancelled or failed consent → `/sign-in` with «Вхід через Google скасовано або не вдався. Спробуйте ще раз».
7. **In-app browsers** (Instagram, Facebook, Telegram, TikTok webviews): Google refuses OAuth there (`disallowed_useragent`). `/sign-in` detects them by user agent and shows «Відкрийте сайт у звичайному браузері, щоб увійти через Google» with a «Скопіювати посилання» button instead of a button that would fail.
8. «Вийти» → `signOut({ scope: 'local' })`, and the browser's saved list is cleared (the account keeps it), so the next person on a shared computer doesn't see it. «Вийти на всіх пристроях» → `scope: 'global'`.
9. «Видалити акаунт» → confirm dialog → server action with the service role `auth.admin.deleteUser(id)`; favorites go with it (`on delete cascade`); leads the visitor sent stay (they aren't linked to the account).
10. Google's consent screen names the Supabase domain (`<project>.supabase.co`) unless a Supabase custom domain is bought; app name and logo come from the Google Cloud consent screen.

## Data
- **Migration** `*_favorites.sql`:
  - `favorites` (`user_id uuid references auth.users on delete cascade`, `property_id uuid references properties on delete cascade`, `created_at timestamptz default now()`, primary key `(user_id, property_id)`, index on `(user_id, created_at desc)`).
  - RLS on: `select`, `insert`, `delete` for `authenticated` where `user_id = (select auth.uid())`; no `update`; nothing for `anon`. Grants to match.
  - Cap: 100 per user (same as `MAX_FAVORITES`), enforced in the facade (past the cap the oldest is dropped) and by a `before insert` trigger as the last line.
  - No `profiles` table: name and email come from the Google identity (`user_metadata.full_name`, `email`). The Google avatar URL is not shown (no third-party image hosts; the account icon shows the name's initial).
- **Turning sign-ups on is a security change:** today `enable_signup = false` and every `authenticated` user is an admin candidate. After this spec anyone with a Google account can be `authenticated`, so every policy `to authenticated` must stay behind `is_admin()` (today: `admins`, `leads`, `properties`, `property_photos` — all checked) and every new one must be scoped to `auth.uid()`. Slice 1 adds a test that a fresh non-admin user reads no leads, admins, drafts or other users' favorites.
- **Only Google creates accounts.** Sign-ups have to be on globally for Google to create users, which also opens email sign-up through the public API. To keep it closed: «Confirm email» on (`[auth.email] enable_confirmations = true`) — an email sign-up then can't sign in, because no mail service sends the confirmation (the built-in sender only mails the project team). Admins are still created in the dashboard with «Auto Confirm User». See Open questions for a stricter hook.
- **`supabase/config.toml`:** `[auth] enable_signup = true`; `[auth.email] enable_confirmations = true`; `site_url` / `additional_redirect_urls` with `/auth/callback`; `[auth.external.google] enabled = true`, `client_id = "env(SUPABASE_AUTH_GOOGLE_CLIENT_ID)"`, `secret = "env(SUPABASE_AUTH_GOOGLE_SECRET)"`, `skip_nonce_check = false`.
- **Feature flag:** `NEXT_PUBLIC_ACCOUNTS=google|off` (empty: `google` in the demo driver; in `supabase` only when set). Public pages are static, so the header learns it at build time. `off` → no header entry, no prompt, `/sign-in` and `/account` 404, favorites local only.
- **Auth facade** `src/lib/auth/user-session.ts`: `getUserSession()` → `{ state: 'anonymous' } | { state: 'user', userId, email, name }` (one `getClaims` per request, `cache`). Server actions in `src/features/account/` (`signInWithGoogle`, `signOut`, `signOutEverywhere`, `deleteAccount`) go through a driver interface (`src/lib/auth/drivers/{supabase,demo}.ts`), so callers never branch on the driver.
- **Favorites facade** `src/lib/db/user-favorites.ts`: `listUserFavorites(userId)`, `addUserFavorite`, `removeUserFavorite`, `mergeUserFavorites(userId, ids)` (union, newest first, cap 100). The Supabase driver uses the user-session client (RLS is the last line); the demo driver keeps a map in memory. Driver contract tests.
- **Route handlers:** `GET /auth/callback` (exchange code → merge → redirect; the browser's ids reach it through a short-lived `httpOnly` cookie `dh_merge` set by the sign-in action from a hidden field filled from `localStorage`), `GET /api/account/favorites`, `POST`/`DELETE /api/account/favorites/[id]`. All reject anonymous callers with 401 and validate with zod.
- **Proxy:** the `src/proxy.ts` matcher grows to `/account/:path*`, `/auth/:path*`, `/sign-in`, `/api/account/:path*` (session refresh; anonymous `/account` → `/sign-in?next=…`; signed-in visitors on `/sign-in` → `/account`). **Public pages stay out of the matcher** and never read cookies on the server, so they stay static/ISR.
- **Signed-in hint for the client:** a small non-`httpOnly` cookie `dh_account=1` (a flag, no data) set at sign-in and cleared at sign-out, or by the proxy when the session is gone. Only when it's present does the client call `/api/account/favorites`. Anonymous visitors make no extra request and load no extra JS; `@supabase/supabase-js` never ships to public pages (sign-in is a server action plus a route handler).
- **Favorites store** (`src/features/favorites/favorites-store.ts`): stays the local cache (`localStorage`) and the source of truth when signed out. Signed in: on load fetch the account list and replace the local one; toggles update locally at once (optimistic) and call the API; on failure revert and announce «Не вдалося зберегти, спробуйте ще раз»; a 401 drops the hint cookie and falls back to local.
- **Demo driver:** users in memory, a signed `httpOnly` cookie like the demo admin (`DEMO_SESSION_SECRET`); «Увійти через Google» goes to a stub consent page `/demo/google` («Продовжити як Demo Visitor» / «Скасувати»), which then hits `/auth/callback` like the real flow. Restarting the server clears accounts, as with the rest of the demo.
- `supabase/seed.sql` regenerated (`pnpm seed:sql`) with a demo visitor (an `auth.users` row with a Google identity) and a few favorites, for RLS tests.

## Slices

### [ ] 1. Accounts foundation: migration, config, session facade, both drivers
- **Build:** `favorites` migration + RLS + cap trigger; types regenerated. `config.toml` auth changes. `NEXT_PUBLIC_ACCOUNTS` flag. Auth driver interface + `supabase` and `demo` drivers, `getUserSession()`. `user-favorites` facade + both drivers + contract tests. Demo visitor store + signed cookie. RLS test: a fresh non-admin user reads no leads, admins, hidden/draft properties or another user's favorites, and can't insert a favorite for someone else. `src/proxy.ts` matcher, session refresh, `dh_account` hint cookie, redirects. `pnpm seed:sql`.
- **Files:** `supabase/migrations/*_favorites.sql`, `supabase/config.toml`, `supabase/seed.sql`, `src/lib/supabase/{database.types,proxy}.ts`, `src/proxy.ts`, `src/lib/auth/user-session.ts`, `src/lib/auth/drivers/*`, `src/lib/db/user-favorites*.ts`, `src/lib/demo/{visitors,session}*.ts`, `src/lib/demo/seed/*`
- **Agent:** backend · **Model:** sonnet
- **Accept:**
  - [ ] every new table has RLS; the non-admin test passes against local Supabase (skipped without it, like the other Supabase tests) and in the demo driver
  - [ ] favorites contract tests pass on both drivers: add, remove, list newest first, merge (union, cap 100, duplicates ignored), cascade on property delete
  - [ ] an email sign-up through the public API can't sign in (confirmation required); the seeded admin still signs in to `/admin`
  - [ ] public routes are not in the proxy matcher; `pnpm build` still shows `/`, `/catalog`, property pages as static/ISR
  - [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` green; a fresh clone without `.env.local` runs

### [ ] 2. Google sign-in and sign-out
- **Build:** `/sign-in`: «Увійти через Google» (Google brand guidelines: the official «G» mark as a local SVG, white button, «Увійти через Google»), privacy line, error message from `?error=google`, in-app-browser notice with «Скопіювати посилання». `signInWithGoogle` action (safe `next`, `dh_merge` cookie) → redirect; `/auth/callback` route (exchange, merge, hint cookie, redirect; errors → `/sign-in?error=google`). `signOut` / `signOutEverywhere` (clear hint cookie). Demo stub `/demo/google`. `noindex` on `/sign-in`, `/account`, `/demo/*`. `docs/setup.md`: Google Cloud + Supabase provider steps.
- **Files:** `src/app/(site)/sign-in/*`, `src/app/auth/callback/route.ts`, `src/app/demo/google/*`, `src/features/account/*`, `src/lib/auth/drivers/*`, `docs/setup.md`
- **Agent:** backend (action, route) → designer (page, states) · **Model:** sonnet
- **Accept:**
  - [ ] demo driver: sign in through the stub, land on `next`; «Скасувати» → `/sign-in` with the message; no network
  - [ ] with a Google OAuth client set locally (optional, documented): the first sign-in creates the user, the second signs into the same one
  - [ ] `next` pointing to another origin is ignored; `/sign-in` while signed in → `/account`
  - [ ] in an in-app browser user agent the notice replaces the button
  - [ ] `/sign-in`: 44 px targets, 375 px without horizontal scroll, the button works with JS off

### [ ] 3. Saved properties across devices + header entry
- **Build:** `/api/account/favorites` routes; favorites store: hint cookie check, load the account list when signed in, optimistic toggle + revert with a message, clear the local list on sign-out. Header: «Увійти» (signed out) / account icon with the name's initial (signed in) next to the favorites link, read from the hint cookie (same box both ways, no layout shift); hidden when `NEXT_PUBLIC_ACCOUNTS=off`. `/favorites`: soft prompt for anonymous visitors («Увійдіть через Google, щоб обране було на всіх пристроях»), hidden when signed in.
- **Files:** `src/app/api/account/favorites/**`, `src/features/favorites/*`, `src/components/layout/{site-header,account-link}.tsx`, `src/constants/inner-pages.ts`
- **Agent:** backend (API, store) → designer (header, prompt) · **Model:** sonnet
- **Accept:**
  - [ ] save 3 properties signed out → sign in → they're in the account; another browser, sign in → the same list; remove one there → gone in the first browser after reload
  - [ ] anonymous visitors: no request to `/api/account/*`; first-load JS on `/`, `/catalog` and a property page within ~5 KB gz of the 018 baseline (`pnpm perf`)
  - [ ] API failure on toggle → the heart reverts and a message is announced; 401 → hint cookie dropped, store falls back to local
  - [ ] after sign-out the hearts are empty in that browser and the account still has the list
  - [ ] header at 375 px: no overflow, no layout shift between signed in and out; `off` → no entry

### [ ] 4. Account page, privacy, docs
- **Build:** `/account`: name and email (from Google, read-only), «Увійшли через Google», link to `/favorites` with the count, «Вийти», «Вийти на всіх пристроях», «Видалити акаунт» (confirm dialog, service role after the session check, then signed out to `/` with a notice). Privacy page: what the account stores (Google name and email, saved properties), what it doesn't (password, photo), how to delete it. `docs/product.md` (visitor with an account; screens), `docs/diagrams.md` (sign-in + favorites flows, `real`/`mock`/`seam`) + `pnpm diagrams`.
- **Files:** `src/app/(site)/account/{page,loading,error}.tsx`, `src/features/account/*`, `src/lib/supabase/admin.ts`, `src/constants/pages.ts`, `docs/{product,diagrams}.md`, `docs/diagrams.html`
- **Agent:** designer (page) + backend (actions) · **Model:** sonnet
- **Accept:**
  - [ ] «Вийти на всіх пристроях» signs out a second browser on its next request
  - [ ] delete account: the user and their favorites are gone, leads stay; the next Google sign-in creates a new, empty account
  - [ ] loading, error, 375 px; delete works with JS off (typed confirmation field instead of the dialog)
  - [ ] `pnpm diagrams` drift test green

## External needs
- **Google Cloud:** a project with an OAuth consent screen (External; app name «Diplomat Hall», logo, support email, privacy policy URL, authorized domain = the site's domain) and an OAuth 2.0 Web client with the redirect URI `https://<project>.supabase.co/auth/v1/callback` (plus `http://127.0.0.1:54321/auth/v1/callback` for local tests). Scopes `openid email profile` only; brand verification only for showing the logo.
- **Supabase dashboard (production):** Authentication → Providers → Google (client ID + secret); «Allow new users to sign up» on; «Confirm email» on; URL Configuration: Site URL + redirect URL `<site>/auth/callback` (and localhost).
- **Env:** `NEXT_PUBLIC_ACCOUNTS=google` in production; locally `SUPABASE_AUTH_GOOGLE_CLIENT_ID` / `SUPABASE_AUTH_GOOGLE_SECRET` only to test real Google against local Supabase.
- New migration to apply (slice 1).
- Optional: Supabase custom domain (paid add-on) so Google's consent screen shows the site's domain.
- No mail service is needed. None of this blocks the build: everything runs on the demo driver.

## Open questions
Each with the recommended answer; settled in the up-front round of `/run-impl`.
1. After sign-out, clear the browser's saved list (recommended, shared computers) or keep it as a local list?
2. On sign-in, merge the browser list into the account silently (recommended) or ask («Додати 3 збережені об'єкти до акаунта?»)?
3. Entry points: header + prompt on `/favorites` (recommended), or also a hint the first time someone presses a heart («Збережено на цьому пристрої. Увійдіть, щоб бачити на всіх»)?
4. Blocking email sign-ups: «Confirm email» on (recommended: zero code), or also a `before_user_created` auth hook that rejects every provider except Google (strict, but it must let dashboard-created admins through)?
5. Delete account in the UI (recommended — expected by users and Google's consent review) or on request to the agency?
6. Visitors without a Google account (or in an in-app browser) keep a local list only; fine until 020 (recommended), or is email sign-in needed from the start?
7. URLs `/sign-in`, `/account` in English (recommended, matches `/favorites`, `/catalog`) or Ukrainian slugs?

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
