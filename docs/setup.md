# Connecting accounts

Everything so far runs locally (local Supabase in Docker, fixture modes). This file collects what the user does to connect the real accounts. Agents never do these steps; they add to this file when a spec needs a new account, key or migration.

## Status

| Service | Status | Needed from |
| --- | --- | --- |
| Supabase | not connected — local only | 002 (now), 007 (auth) |
| Cloudflare (Workers, R2, Turnstile) | not connected | deploy, 003 (R2), 006 (Turnstile) |
| Plektan | not connected — fixtures | 003, 006 |
| Telegram bot | not connected — fixtures | 006 |
| LLM | not connected — fixtures | 010 |

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

### 4. Check
- Dashboard → Advisors → Security: no "RLS disabled" warnings.
- Table editor: `settings` has exactly one row; `properties_source` is `plektan` (switch to `admin` if the agency won't use Plektan).
- Set real exchange rates in `settings.exchange_rates` (UAH and EUR per 1 USD) until the admin can edit them (008).

### 5. Later
- **Auth (007):** site URL and redirect URLs (production domain + `http://localhost:3000`), the admin users' emails, SMTP for magic links.
- Types: `src/lib/supabase/database.types.ts` is generated from the local DB (`pnpm db:types`); it matches production as long as every migration is applied.
