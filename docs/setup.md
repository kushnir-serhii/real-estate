# Connecting accounts

Everything so far runs locally (local Supabase in Docker, fixture modes). This file collects what the user does to connect the real accounts. Agents never do these steps; they add to this file when a spec needs a new account, key or migration.

## Status

| Service | Status | Needed from |
| --- | --- | --- |
| Supabase | not connected — local only; 007 adds admin auth (email + password, sign-ups off, `admins` table) | 002 (now), 007 (auth) |
| Cloudflare (Workers, R2) | not connected | deploy, 003 (R2) |
| Cloudflare Turnstile | not connected — the check passes in fixture mode, no widget | 006 |
| Plektan | not connected — fixtures; 003 sync is ready, needs the API key and `PLEKTAN_*_ID`; leads are `skipped` until the key exists (local: `PLEKTAN_LEADS_FIXTURE`) | 003, 006 |
| Telegram bot | not connected — the channel is `skipped` (local: `TELEGRAM_FIXTURE`) | 006 |
| LLM | not connected — fixtures | 010 |

## Site URL

Set `NEXT_PUBLIC_SITE_URL` to the production domain (for example `https://sofiacity.example`, no trailing path) in Cloudflare, for **build and runtime** (`NEXT_PUBLIC_*` are inlined at build time). It sets `metadataBase` and canonical URLs. Empty means `http://localhost:3000`, fine for local work only.

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

### 4. Check
- Dashboard → Advisors → Security: no "RLS disabled" warnings.
- Table editor: `settings` has exactly one row; `properties_source` is `plektan` (switch to `admin` if the agency won't use Plektan).
- Set real exchange rates in `settings.exchange_rates` (UAH and EUR per 1 USD) until the admin can edit them (008).

### 5. Later
- Types: `src/lib/supabase/database.types.ts` is generated from the local DB (`pnpm db:types`); it matches production as long as every migration is applied.

## Admin (spec 007)

Email + password sign-in; no SMTP needed. The local demo admin (`admin@sofiacity.local` / `admin12345`, plus a non-admin `user@sofiacity.local`) exists only in `supabase/seed.sql`; never seeded in production.

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

### Turnstile
1. Cloudflare dashboard → Turnstile → Add site → the production domain (add `localhost` only if you want to test the real widget locally).
2. `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: Cloudflare **build and runtime** (`NEXT_PUBLIC_*` is inlined at build time). Empty = the forms show no widget.
3. `TURNSTILE_SECRET_KEY`: Cloudflare **runtime secret**. Empty = the server check always passes (fixture), so never leave it empty in production.

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

The same workflow has a separate `leads` job that runs on every schedule: it calls `/api/cron/leads` to retry failed lead deliveries to Plektan and Telegram (up to 5 attempts, after 5 min, 15 min, 1 h, 3 h) and to pick up leads whose first delivery was lost. After the 5th failed Plektan attempt the manager gets one Telegram alert with the name and phone. It needs `CRON_SECRET` and `NEXT_PUBLIC_SITE_URL` (below) and runs even when `PLEKTAN_API_KEY` is empty; without those two it is skipped with a notice.

### Repo secrets
GitHub → repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Where the value comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (same values as in Cloudflare) |
| `PLEKTAN_API_KEY` | from the agency (Plektan account); empty = the job is skipped |
| `PLEKTAN_COUNTRY_ID`, `PLEKTAN_REGION_ID`, `PLEKTAN_LOCALITY_ID` | Plektan geography ids of the agency's area; `search` needs a geography. Empty ones are left out of the request |
| `CRON_SECRET` | any long random string (for example `openssl rand -hex 32`); the **same** value must be set as a runtime secret in Cloudflare, where `/api/cron/revalidate` checks it |
| `NEXT_PUBLIC_SITE_URL` | the production domain, for example `https://sofiacity.example`; the script posts the cache purge to it |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `NEXT_PUBLIC_R2_PUBLIC_URL` | Cloudflare R2 (used by the photo step, spec 003 slice 4) |
| `GEOCODER_CONTACT_EMAIL` | a real, monitored email for Nominatim's User-Agent (usage policy: max 1 request/s, identify yourself); empty = fixture mode with fake coordinates, so never leave it empty in production. Coordinates are rounded to ~100 m. Wherever coordinates or a map are shown (spec 005) the page must carry the attribution "© OpenStreetMap contributors" |

### Run it by hand
Actions → "Plektan sync" → Run workflow (tick **full** for a full sync). The same works locally: `pnpm sync`, `pnpm sync --full`, with flags `--no-revalidate` and `--force-hide` (hide vanished properties even when the safety guard refuses: it refuses if the result is empty or fewer than half of the published Plektan properties would remain).

### First real run
1. Check `PLEKTAN_COUNTRY_ID` / `PLEKTAN_REGION_ID` / `PLEKTAN_LOCALITY_ID` against the Plektan account.
2. Make sure `settings.properties_source` is `plektan` and the migration above is applied.
3. Run **full** by hand once and read the summary (`added`, `updated`, `hidden`, `unchanged`, `skipped`, `failed`) before leaving the schedule on.

### Actions minutes
On a private repo the free plan gives 2000 minutes a month. About 34 incremental runs a day plus a nightly full sync come to roughly 1000 minutes (every run is billed in whole minutes); watch Settings → Billing, and make the interval longer in `sync.yml` if needed.
