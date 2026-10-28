# 006 — Leads: forms → Supabase → Plektan → Telegram

**Status:** done · **Depends on:** 002, 004 · **Route(s):** forms on `/catalog/[slug]` (live and sold), `/contacts`, `/` (home CTA)

## Goal
Every request a visitor sends is saved, reaches Plektan as a lead and pings the manager in Telegram within seconds — and is never lost if Plektan or Telegram fails. The pipeline is reused by the admin (007, manual retry) and the AI assistant (010).

## Scope
- In: property request form («Цікавить об'єкт №…») on the live property page; general request form (buy/rent wishes) on `/contacts`, the home CTA («Не знайшли потрібне?») and the sold page («Підберемо схожий»); consent to personal data processing (link to `/privacy`); Turnstile + honeypot; server action; Plektan `addAdvert`; Telegram message; retry cron.
- Out: admin list and manual retry (007), AI leads (010; reuses `deliverLead`).

## Data
`leads` (002); new migration for retry scheduling (slice 3). `src/lib/db/leads.ts` (`createLead` exists), `src/lib/plektan` (`addAdvert`), `src/lib/telegram`, `src/lib/turnstile`, `src/features/leads/`.

- **Keys empty = channel off.** Empty `PLEKTAN_API_KEY` / `TELEGRAM_BOT_TOKEN` + `TELEGRAM_MANAGER_CHAT_ID` → that channel's status is `skipped` (honest: Plektan may be switched off for good), never a fake `sent`. For local work a fixture flag per channel turns on a fixture transport: `PLEKTAN_LEADS_FIXTURE=ok|fail`, `TELEGRAM_FIXTURE=ok|fail` (empty = off). The Telegram fixture logs that a message would be sent, without personal data.
- **Turnstile:** empty `TURNSTILE_SECRET_KEY` → server check passes (fixture); empty `NEXT_PUBLIC_TURNSTILE_SITE_KEY` → no widget. The widget is Cloudflare's script (`challenges.cloudflare.com/turnstile`), no npm package. Plus a hidden honeypot field: filled = silently accepted, not saved.
- **Phone:** input mask for `+380 XX XXX XX XX` by default; also accepts international numbers (`+` and 10–15 digits). Stored normalized (`+380…`, digits only after `+`).
- **Double submit:** `client_request_id` (uuid made when the form mounts, new one after success) + button disabled while pending; `createLead` is already idempotent on it.
- **Context saved with the lead:** `page_url`, `utm` (`utm_*` from the page URL), `property_id` for property requests; `payload` for the general form (`deal`: buy | rent, `property_type`) and for the sold page (`similar_to`: the sold property's id/slug/title).
- **Delivery timing:** the action saves the lead and answers the visitor right away; Plektan and Telegram run after the response (`after()` from `next/server`, `waitUntil` on Workers). Failures are left to the cron.
- **Plektan mapping:** property request **with email** and a Plektan property (`source = plektan`, `external_id`) → quick request (`like_advert` = `external_id`, `client_email`). Without email, or an admin-entered property → a regular buy/hire request (`deal` buy | hire_long from the property's deal, `property` + all `prop_kind`s of that type) with `advert_info` «Цікавить об'єкт №… <link>» + message. General form → buy/hire request from its `deal` / `property_type`. Verify with Plektan once the key exists.
- **Telegram:** one manager chat (`TELEGRAM_MANAGER_CHAT_ID`). Message: kind, name, phone, email, property title + link (+ Plektan №), message, wishes from `payload`, page.
- **Retry:** max 5 attempts per channel, backoff 5 min → 15 min → 1 h → 3 h; after the last failed Plektan attempt one Telegram alert to the manager chat («заявка не дійшла до Plektan», with name + phone so nothing is lost). Triggered by a step in `.github/workflows/sync.yml` (every run, also when the sync itself is skipped for an empty Plektan key) calling `POST /api/cron/leads` with `CRON_SECRET`.

## Slices

### [x] 1. Forms + save
- **Build:** backend: `src/lib/turnstile` (verify, fixture when the secret is empty), phone normalize/validate, `submitLead` server action (zod: name, phone, optional email, optional message, consent required, honeypot, turnstile token, kind-specific fields) → `createLead`; returns a discriminated result (`ok` | `invalid` with field errors | `error`). UI: `PropertyRequestForm` in the property page aside (replaces the «Залишити заявку» target; the desktop CTA and the mobile bar scroll to it; the contact card stays below it) and `GeneralRequestForm` (deal: купити / орендувати, type, name, phone, email, message) on `/contacts`, in the home CTA and in the sold page's «Підберемо схожий». Fields with labels, inline errors (`role="alert"`), pending state, success state («Дякуємо! Зателефонуємо найближчим часом» + «Надіслати ще одну») announced with `role="status"`, error state keeps the input and offers retry. Turnstile widget + consent checkbox with a `/privacy` link. Works at 375px.
- **Files:** `src/features/leads/*`, `src/lib/turnstile/*`, `src/features/property/{property-view,property-mobile-bar,sold-contact-block}.tsx`, `src/features/home/home-cta.tsx`, `src/app/(site)/contacts/page.tsx`, `.env.example`
- **Agent:** backend (turnstile, phone, action) → designer (forms and placement)
- **Accept:**
  - [x] the lead is in Supabase even with Plektan/Telegram/Turnstile keys empty
  - [x] double submit doesn't create two leads
  - [x] invalid phone, missing name or consent show a field error and nothing is saved
  - [x] success, error and pending states are designed and announced; 375px without horizontal scroll

### [x] 2. Delivery: Plektan + Telegram
- **Build:** `addAdvert` in the Plektan client (zod on the `{ result, item_id, message }` answer; fixture transport `ok`/`fail` from `PLEKTAN_LEADS_FIXTURE`), `src/lib/telegram` (`sendMessage`, timeout, fixture from `TELEGRAM_FIXTURE`, HTML-escaped text), `deliverLead(id)` in `src/features/leads/` (server-only): runs each channel that is `pending`/`failed`, independently, and records status / error (no personal data in the error) / attempts / `plektan_item_id`; empty key → `skipped`. The action calls it via `after()`.
- **Files:** `src/lib/plektan/*`, `src/lib/telegram/*`, `src/features/leads/deliver-lead.ts`, `src/lib/db/leads.ts`, `.env.example`, `docs/setup.md`
- **Agent:** backend
- **Accept:**
  - [x] a Plektan error leaves `plektan_status = failed` and the Telegram message still goes out
  - [x] with empty keys and no fixture flags both channels are `skipped`
  - [x] quick request vs regular request is chosen as in **Data**; unit tests for the mapping and the message text

### [x] 3. Retry
- **Build:** migration adding `plektan_next_attempt_at` / `telegram_next_attempt_at` (or one shared column if simpler; index on due failed leads); `POST /api/cron/leads` (checks `CRON_SECRET` like `/api/cron/revalidate`) picks due failed deliveries (attempts < 5), runs `deliverLead`, sets the next attempt by the backoff; after the last failed Plektan attempt sends the one-time Telegram alert. A step in `sync.yml` calls it on every run. Types regenerated; migration listed in `docs/setup.md`.
- **Files:** `supabase/migrations/*`, `src/lib/supabase/database.types.ts`, `src/app/api/cron/leads/route.ts`, `src/features/leads/*`, `.github/workflows/sync.yml`, `docs/setup.md`
- **Agent:** backend
- **Accept:**
  - [x] a lead that failed is delivered on the next run once the fixture succeeds
  - [x] a delivery isn't retried before its next attempt time or after 5 attempts; the alert goes out once

## External needs
- Telegram bot token + manager chat id (a group with the managers; the bot must be added to it).
- Turnstile site + secret keys (Cloudflare dashboard → Turnstile, the production domain).
- Plektan key (already needed by 003); confirm with Plektan that regular buy/hire requests from the site are fine when the visitor gives no email.
- Privacy policy text (004).

## Open questions
- **Decided:** `addAdvert` quick request needs `client_email` → without email (or for admin-entered properties) send a regular buy/hire request with «Цікавить об'єкт №…» in `advert_info`.
- **Decided:** one Telegram chat for all managers.
- **Decided:** empty keys = `skipped`; local fixtures behind per-channel flags.
- **Decided:** forms on the property page, `/contacts`, the home CTA and the sold page.
- `rent_day` properties map to Plektan `hire_day`; a general lead without a type goes to Plektan as `flat`; quick requests also send `property`/`prop_kind`. Confirm with Plektan once the key exists.
- For 007: `deliverLead` treats a `failed` channel with 5 attempts as final; the admin's manual retry needs an explicit override (or a reset of attempts).
- `deliverLead` runs every `pending`/`failed` channel of a lead, so when one channel is due the other failed one may be retried a bit before its own time. Harmless; tighten if it matters.
- **Decided:** retry runs from `sync.yml`; phone accepts UA + international; Turnstile + honeypot; max 5 attempts.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-28 | 1 | done | Turnstile client (fixture on empty secret), phone normalize/mask, `submitLead` action (honeypot → zod → Turnstile → published-property check → `createLead`); shared `LeadForm` (submits via transition so input survives errors; network failure → error state), `PropertyRequestForm` in the property aside (`#zayavka`, CTA + mobile bar point to it; aside no longer sticky), `GeneralRequestForm` on `/contacts`, home CTA, sold page (`similar_to`, deal preselected). shadcn `textarea`. Files: `src/features/leads/*`, `src/lib/turnstile/*`, `src/components/ui/textarea.tsx`, `src/features/property/*`, `src/features/home/home-cta.tsx`, `src/app/(site)/contacts/page.tsx`, `.env.example` |
| 2026-10-28 | 2 | done | Plektan `addAdvert` (no auto-retry, zod answer, `PLEKTAN_LEADS_FIXTURE`), `src/lib/telegram` (`TELEGRAM_FIXTURE`, errors without the token), pure builders for the Telegram text / `advert_info` / Plektan request, `deliverLead` (channels independent, kind-only errors, attempts, `plektan_item_id`; empty keys = `skipped`), wired via `after()` for new leads. Files: `src/lib/plektan/*`, `src/lib/telegram/*`, `src/features/leads/{deliver-lead,lead-delivery-content,submit-lead}.ts`, `src/lib/db/leads.ts`, `.env.example`, `docs/setup.md` |
| 2026-10-28 | 3 | done | Migration `20261028160000_lead_retry.sql` (`*_next_attempt_at`, `plektan_alerted_at`, partial indexes), types regenerated; backoff 5 min / 15 min / 1 h / 3 h, max 5; `POST /api/cron/leads` (shared `isCronAuthorized`) retries due failed and stale pending (>10 min) leads, one-time Plektan alert to Telegram; `leads` job in `sync.yml` with its own concurrency group. Files: `supabase/migrations/*`, `src/lib/supabase/database.types.ts`, `src/app/api/cron/{leads,revalidate}/route.ts`, `src/lib/cron/*`, `src/features/leads/{retry-schedule,retry-leads,deliver-lead}.ts`, `src/lib/db/leads.ts`, `.github/workflows/sync.yml`, `docs/setup.md` |
| 2026-10-28 | UI check | passed | `SPEC=006 ROUTES=root,contacts,catalog/<live>,catalog/<sold>`: 16/16 at 375 and 1280, light and dark; screenshots reviewed. Fix: neutral message placeholder. |
