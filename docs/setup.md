# Connecting accounts

Everything so far runs locally (local Supabase in Docker, fixture modes). This file collects what the user does to connect the real accounts. Agents never do these steps; they add to this file when a spec needs a new account, key or migration.

## Status

| Service | Status | Needed from |
| --- | --- | --- |
| Supabase | not connected — local only | 002 (now), 007 (auth) |
| Cloudflare (Workers, R2, Turnstile) | not connected | deploy, 003 (R2), 006 (Turnstile) |
| Plektan | not connected — fixtures; 003 sync is ready, needs the API key and `PLEKTAN_*_ID` | 003, 006 |
| Telegram bot | not connected — fixtures | 006 |
| LLM | not connected — fixtures | 010 |

## Site URL

Set `NEXT_PUBLIC_SITE_URL` to the production domain (for example `https://lyndrik.example`, no trailing path) in Cloudflare, for **build and runtime** (`NEXT_PUBLIC_*` are inlined at build time). It sets `metadataBase` and canonical URLs. Empty means `http://localhost:3000`, fine for local work only.

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

### 4. Check
- Dashboard → Advisors → Security: no "RLS disabled" warnings.
- Table editor: `settings` has exactly one row; `properties_source` is `plektan` (switch to `admin` if the agency won't use Plektan).
- Set real exchange rates in `settings.exchange_rates` (UAH and EUR per 1 USD) until the admin can edit them (008).

### 5. Later
- **Auth (007):** site URL and redirect URLs (production domain + `http://localhost:3000`), the admin users' emails, SMTP for magic links.
- Types: `src/lib/supabase/database.types.ts` is generated from the local DB (`pnpm db:types`); it matches production as long as every migration is applied.

## Plektan sync (GitHub Actions)

`.github/workflows/sync.yml` runs `pnpm sync` (spec 003): incremental every 30 minutes 07:00-22:00 Kyiv time, a full sync nightly, and on demand. It writes to Supabase directly and then calls `/api/cron/revalidate` on the site to refresh the cache. Without `PLEKTAN_API_KEY` the job exits early with a notice (fixtures are never synced into production).

### Repo secrets
GitHub → repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Where the value comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (same values as in Cloudflare) |
| `PLEKTAN_API_KEY` | from the agency (Plektan account); empty = the job is skipped |
| `PLEKTAN_COUNTRY_ID`, `PLEKTAN_REGION_ID`, `PLEKTAN_LOCALITY_ID` | Plektan geography ids of the agency's area; `search` needs a geography. Empty ones are left out of the request |
| `CRON_SECRET` | any long random string (for example `openssl rand -hex 32`); the **same** value must be set as a runtime secret in Cloudflare, where `/api/cron/revalidate` checks it |
| `NEXT_PUBLIC_SITE_URL` | the production domain, for example `https://lyndrik.example`; the script posts the cache purge to it |
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
