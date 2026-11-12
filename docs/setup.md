# Connecting accounts

Everything runs in **demo mode** out of the box: mock data in memory, no Docker, no keys, no network (spec 011). This file collects what the user does to leave it and connect the real accounts. Agents never do these steps; they add to this file when a spec needs a new account, key or migration.

## Leaving demo mode

The demo is the same code on a different data driver, so leaving it is configuration, not a rewrite. Connect the accounts in the order of [template.md](template.md); the steps here are the switch itself.

1. **Set the driver and the keys.** In Cloudflare (and in `.env.local` / `.dev.vars` to try it locally) set `DATA_DRIVER=supabase` plus `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` (see **Supabase**). A build with `DATA_DRIVER=supabase` and no public Supabase env fails on purpose. Leaving `DATA_DRIVER` empty also selects `supabase` as soon as the Supabase env is set.
2. **Unset the `DEMO_*` variables.** `DEMO_SESSION_SECRET` and `DEMO_UPLOAD_MAX_MB` only matter on the demo driver. On the `supabase` driver the demo sign-in button, `/api/demo/*` and the demo banner are gone (404).
3. **Admin.** Create the first admin (see **Admin**); the one-click demo admin disappears.
4. **Photos.** The demo keeps uploads in memory and needs no R2 binding, so `wrangler.jsonc` has none (deploying with a binding to a missing bucket fails). Create the R2 bucket and add the `PHOTOS_BUCKET` binding (see **Admin photos: R2 binding**).
5. **Site URL.** Set `NEXT_PUBLIC_SITE_URL` (see **Site URL**). A demo build without it only warns and uses `http://localhost:3000`; a `supabase` build fails.
6. **Replace the demo content.** Brand, contacts and texts in `src/constants/` (see [template.md](template.md)); the listings and pages in `src/lib/demo/seed/` are demo-only. `supabase/seed.sql` is that same demo data for a local Supabase: never seed production with it.
7. Connect the rest: Turnstile, Telegram, Plektan (optional), the LLM key.

What the demo replaces, and what takes over:

| Demo (`DATA_DRIVER=demo`) | Real (`DATA_DRIVER=supabase`) |
| --- | --- |
| Data store: typed mock data in memory (`src/lib/demo/`); resets on restart and with «Скинути демо-дані» | Supabase Postgres with RLS (migrations below) |
| Admin auth: one-click demo sign-in, a signed `httpOnly` cookie (`DEMO_SESSION_SECRET`) | Supabase Auth, email + password, `admins` table |
| Photo storage: uploads kept in memory, served by `/api/demo/photos/...`; seed photos are the files in `public/placeholders/` | Cloudflare R2 (binding `PHOTOS_BUCKET`, public URL) |
| Fonts and maps: local Manrope, a static SVG map; nothing is loaded from third parties | unchanged: they stay local |
| Plektan: `pnpm sync` prints a notice and exits 0; the Plektan badge is hidden | sync and badge once `PLEKTAN_API_KEY` is set |
| Plektan leads, Telegram, Turnstile, LLM, geocoder: fixture modes while their keys are empty | the real services once their keys are set |

## Status

| Service | Status | Needed from |
| --- | --- | --- |
| Supabase | not connected: demo mode (mock data in memory); a local Supabase in Docker is optional, only to test the `supabase` driver | 002, 007 (auth) |
| Cloudflare (Workers, R2) | not connected | deploy, 003 (R2) |
| Cloudflare Turnstile | not connected — the check passes in fixture mode, no widget | 006 |
| Plektan | not connected — fixtures; 003 sync is ready, needs the API key and `PLEKTAN_*_ID`; leads are `skipped` until the key exists (local: `PLEKTAN_LEADS_FIXTURE`) | 003, 006 |
| Telegram bot | not connected — the channel is `skipped` (local: `TELEGRAM_FIXTURE`) | 006 |
| LLM | not connected — fixture assistant (scripted, answers without a key); set `LLM_API_KEY` (+ optional `LLM_MODEL`, default `gpt-4o-mini`) | 010 |

## Site URL

Set `NEXT_PUBLIC_SITE_URL` to the production domain (for example `https://7sky.example`, no trailing path) in Cloudflare, for **build and runtime** (`NEXT_PUBLIC_*` are inlined at build time). It sets `metadataBase` and canonical URLs. Empty means `http://localhost:3000` in `pnpm dev`. A production build (`pnpm build`, `pnpm preview`, `pnpm deploy`) on the `demo` driver warns and uses localhost; on the `supabase` driver it fails with a clear error if the value is empty or not a valid URL. For a local `supabase` build without a domain put `SEO_ALLOW_LOCALHOST=1` in `.env.local` (never in Cloudflare).

## Supabase

### 1. Project
- Create the project in the **client's** Supabase account (Pro plan), region close to Ukraine (Frankfurt, `eu-central-1`).
- Save the database password somewhere safe (it's needed for `db push`).

### 2. Keys
From Project Settings → API:

| Variable | Where it goes |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local`, `.dev.vars`, Cloudflare (build **and** runtime: `NEXT_PUBLIC_*` are inlined at build time) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local`, `.dev.vars`, Cloudflare runtime secret only. Never in the browser, never committed |

### 3. Apply migrations
From the repo root, on the branch that has been merged into `main`:

```sh
pnpm exec supabase login
pnpm exec supabase link --project-ref <project-ref>
pnpm exec supabase db push --dry-run   # check the list below matches
pnpm exec supabase db push
```

**Don't seed production.** `supabase/seed.sql` is local demo data; `db push` doesn't run it.

Migrations to apply (in order; add new ones here when a spec adds them):

| Migration | Spec | Applied |
| --- | --- | --- |
| `20261028120000_properties.sql` | 002 | [ ] |
| `20261028130000_leads_pages_settings.sql` | 002 | [ ] |
| `20261028140000_hide_private_property_columns.sql` | 003 | [ ] |
| `20261028150000_property_hidden_at.sql` | 005 | [ ] |
| `20261028160000_lead_retry.sql` | 006 | [ ] |
| `20261028170000_admins.sql` | 007 | [ ] |
| `20261029120000_admin_properties.sql` | 008 | [ ] |
| `20261029130000_pages_noindex.sql` | 009 | [ ] |
| `20261029140000_pages_is_draft.sql` | 009 | [ ] |
| `20261029150000_ai_assistant.sql` | 010 | [ ] |
| `20261104120000_ai_limits.sql` | 010 | [ ] |
| `20261105120000_blog.sql` | 015 | [ ] |
| `20261112120000_leads_telegram_alerted_at.sql` | 017 | [ ] |

### 4. Check
- Dashboard → Advisors → Security: no "RLS disabled" warnings.
- Table editor: `settings` has exactly one row; `properties_source` is `plektan` (switch to `admin` if the agency won't use Plektan).
- Set real exchange rates in `settings.exchange_rates` (UAH and EUR per 1 USD) until the admin can edit them (008).

### 5. Later
- Types: `src/lib/supabase/database.types.ts` is generated from the local DB (`pnpm db:types`); it matches production as long as every migration is applied.

## Admin (spec 007)

Email + password sign-in; no SMTP needed. On the demo driver sign-in is one click and needs no account. On a **local** Supabase the seed creates `demo@example.com` / `admin12345` (an admin) and a non-admin `user@example.com` / `user12345`; they exist only in `supabase/seed.sql`, which is never run in production.

### Auth settings (Supabase dashboard)
- Authentication → Sign In / Providers → turn **off** "Allow new users to sign up". Keep the **Email** provider on with password sign-in.
- Authentication → URL Configuration: Site URL = the production domain; Redirect URLs = the production domain and `http://localhost:3000`.

### Add an admin
1. Authentication → Users → Add user → Create new user: email + password, tick "Auto Confirm User".
2. SQL editor:
   ```sql
   insert into public.admins (user_id, email)
   select id, email from auth.users where email = 'person@example.com';
   ```
To remove access: `delete from public.admins where email = '...';`. Password reset: Authentication → Users → the user → Send password recovery, or set a new password there.

## Leads: Telegram, Turnstile, Plektan (spec 006)

A lead is always saved in Supabase first. Then, after the response, it goes to Plektan (`addAdvert`) and to the managers' Telegram chat. A channel whose keys are empty is marked `skipped` (never a fake `sent`). For local work `PLEKTAN_LEADS_FIXTURE=ok|fail` and `TELEGRAM_FIXTURE=ok|fail` switch on a fake transport per channel; never set them in production.

### Telegram
1. In Telegram, open @BotFather → `/newbot` → pick a name and a username → copy the **bot token**.
2. Create a group with the managers and add the bot to it (and give it permission to write).
3. Get the chat id: send any message in the group, open `https://api.telegram.org/bot<token>/getUpdates` in a browser and read `message.chat.id` (a negative number for groups, for example `-1001234567890`).
4. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_MANAGER_CHAT_ID` as **runtime secrets** in Cloudflare (and in `.dev.vars` / `.env.local` to try it locally). Both must be set, otherwise the channel is `skipped`.

### Leads that arrived before a channel was connected
A lead saved while a channel was off keeps that channel `skipped`. Once the keys are set, the retry cron (every 30 minutes) moves `skipped` back to `pending` for leads younger than 7 days and sends them in the same run; nothing is sent twice, and the two channels are independent. Older leads stay `skipped`: open the lead in the admin and press «Надіслати» for that channel (one attempt, any age). While a channel is still off nothing changes and no attempt is counted.

### Turnstile
1. Cloudflare dashboard → Turnstile → Add site → the production domain (add `localhost` only if you want to test the real widget locally).
2. `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: Cloudflare **build and runtime** (`NEXT_PUBLIC_*` is inlined at build time). Empty = the forms show no widget.
3. `TURNSTILE_SECRET_KEY`: Cloudflare **runtime secret**. Empty = the server check always passes (fixture), so never leave it empty in production.

### AI assistant limits (spec 010 slice 4)
1. Apply `20261104120000_ai_limits.sql` (the monthly spend counter `ai_usage`, message dedupe, IP index).
2. `ASSISTANT_IP_SALT`: Cloudflare **runtime secret**, a long random value (for example `openssl rand -hex 32`). Visitor IPs are stored only as a salted hash; empty = a fixed dev salt, so never leave it empty in production. Changing it resets everyone's rate-limit history.
3. Budget and limits (optional, runtime variables): `LLM_MONTHLY_BUDGET_USD` (20), `ASSISTANT_RATE_LIMIT` (20) per `ASSISTANT_RATE_WINDOW_MIN` (10), `ASSISTANT_CONVERSATION_LIMIT` (30). Prices live in `src/lib/llm/pricing.ts`; update them if OpenAI changes prices or you switch `LLM_MODEL`.
4. Also set a hard monthly limit in the OpenAI dashboard (Settings → Limits): the in-app cap is an estimate from token usage.
5. Turnstile (above) protects the first message of each chat; with an empty `TURNSTILE_SECRET_KEY` the check passes.
6. Cleanup: the `assistant-cleanup` job in `.github/workflows/sync.yml` calls `/api/cron/assistant` nightly (and on manual run) and deletes chats older than 30 days; leads are kept. Needs `CRON_SECRET` and `NEXT_PUBLIC_SITE_URL` like the `leads` job.

### Plektan leads
Leads use the same `PLEKTAN_API_KEY` as the sync; set it as a **runtime secret** in Cloudflare too (the sync only has it in GitHub Actions). Before launch, confirm with Plektan that regular buy / rent requests without an email are accepted from the site (the quick request needs an email).

## Admin photos: R2 binding (spec 008 slice 4)

The admin uploads photos through `POST /api/admin/photos`, which writes to R2 using a Worker **binding** (no S3 keys needed on Cloudflare). Order in `src/lib/r2`: binding `PHOTOS_BUCKET`, else the S3 API (`R2_*`, used by `pnpm sync`), else local fixture mode (`public/r2-local/`).

1. Create the R2 bucket (the same one the sync writes to) and enable its public access / custom domain.
2. In `wrangler.jsonc` add (not added yet: deploying with a missing bucket fails):
   ```jsonc
   "r2_buckets": [{ "binding": "PHOTOS_BUCKET", "bucket_name": "<bucket>" }]
   ```
   then run `pnpm cf-typegen` to refresh `cloudflare-env.d.ts`.
3. Set `NEXT_PUBLIC_R2_PUBLIC_URL` (the bucket's public base URL) in Cloudflare as a **build** variable too, since it is inlined into the client bundle; without it the site links photos to `/r2-local/...`.

## Plektan sync (GitHub Actions)

`.github/workflows/sync.yml` runs `pnpm sync` (spec 003): incremental every 30 minutes 07:00-22:00 Kyiv time, a full sync nightly, and on demand. It writes to Supabase directly and then calls `/api/cron/revalidate` on the site to refresh the cache. Without `PLEKTAN_API_KEY` the job exits early with a notice (fixtures are never synced into production).

The same workflow has a separate `leads` job that runs on every schedule: it calls `/api/cron/leads` to retry failed lead deliveries to Plektan and Telegram (up to 5 attempts, after 5 min, 15 min, 1 h, 3 h) and to pick up leads whose first delivery was lost. After the 5th failed Plektan attempt, or the 5th failed Telegram attempt, the manager gets one Telegram alert with the name and phone and a link to the lead in the admin (one message when both channels gave up; a Telegram alert goes out once Telegram works again, and is repeated by the next run if sending it fails). The alert is sent only while Telegram is on. It needs `CRON_SECRET` and `NEXT_PUBLIC_SITE_URL` (below) and runs even when `PLEKTAN_API_KEY` is empty; without those two it is skipped with a notice.

### Repo secrets
GitHub → repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Where the value comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (same values as in Cloudflare) |
| `PLEKTAN_API_KEY` | from the agency (Plektan account); empty = the job is skipped |
| `PLEKTAN_COUNTRY_ID`, `PLEKTAN_REGION_ID`, `PLEKTAN_LOCALITY_ID` | Plektan geography ids of the agency's area; `search` needs a geography. Empty ones are left out of the request |
| `CRON_SECRET` | any long random string (for example `openssl rand -hex 32`); the **same** value must be set as a runtime secret in Cloudflare, where `/api/cron/revalidate` checks it |
| `NEXT_PUBLIC_SITE_URL` | the production domain, for example `https://7sky.example`; the script posts the cache purge to it |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `NEXT_PUBLIC_R2_PUBLIC_URL` | Cloudflare R2 (used by the photo step, spec 003 slice 4) |
| `GEOCODER_CONTACT_EMAIL` | a real, monitored email for Nominatim's User-Agent (usage policy: max 1 request/s, identify yourself); empty = fixture mode with fake coordinates, so never leave it empty in production. Coordinates are rounded to ~100 m. Wherever coordinates or a map are shown (spec 005) the page must carry the attribution "© OpenStreetMap contributors" |

### Run it by hand
Actions → "Plektan sync" → Run workflow (tick **full** for a full sync). The same works locally: `pnpm sync`, `pnpm sync --full`, with flags `--no-revalidate` and `--force-hide` (hide vanished properties even when the safety guard refuses: it refuses if the result is empty or fewer than half of the published Plektan properties would remain).

Guard: with the `supabase` driver and an empty `PLEKTAN_API_KEY`, `pnpm sync` stops with exit code 1 and writes nothing, because the Plektan client would fall back to fixtures and insert fake listings. To sync fixtures on purpose into a local Supabase, run `pnpm sync --fixtures`. With a key set the flag is rejected (exit code 2), so it can't linger in a real command. The demo driver is unaffected (it prints a notice and exits 0).

### First real run
1. Check `PLEKTAN_COUNTRY_ID` / `PLEKTAN_REGION_ID` / `PLEKTAN_LOCALITY_ID` against the Plektan account.
2. Make sure `settings.properties_source` is `plektan` and the migration above is applied.
3. Run **full** by hand once and read the summary (`added`, `updated`, `hidden`, `unchanged`, `skipped`, `failed`) before leaving the schedule on.

### Actions minutes
On a private repo the free plan gives 2000 minutes a month. About 34 incremental runs a day plus a nightly full sync come to roughly 1000 minutes (every run is billed in whole minutes); watch Settings → Billing, and make the interval longer in `sync.yml` if needed.
